import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Request as Req, Response as Res } from "express";
import fs from "node:fs/promises";
import jwt from "jsonwebtoken";

import { PlayableTrack } from "@common/types";
import { Request } from "@server/trpc";
import { db } from "@server/lib/data/db";
import { AudioQuality, Prisma } from "@prisma/client";
import {
  convert as convertAudioTrack,
  remuxToCaf,
} from "@server/lib/conversion";
import { resolveTier } from "@server/lib/media/resolveTier";
import { qualityToRenditionTier } from "@server/lib/media/renditionTiers";
import {
  findRendition,
  moveRenditionIntoCache,
} from "@server/lib/media/RenditionCache";
import { markRenditionJobDone } from "@server/lib/media/RenditionQueue";
import { stream_file as streamAudioTrack } from "@server/lib/io/stream";
import { adjustImage } from "@server/lib/media/image/ImageAdjust";
import { env } from "@server/init";
import { getAlbumFromFs } from "@server/lib/media/image/ImageCache";
import { pagination_schema } from "@common/schema";
import { DEFAULT_OFFSET } from "@common/pagination";

export const schema = {
  cast_info: z.object({
    track_ids: z.array(z.number().int()),
  }),
  get: z.object({
    album_id: z.number().int().optional(),
    artist_id: z.number().int().optional(),
    genre_id: z.number().int().optional(),
    options: pagination_schema,
  }),
  getTrackTiles: z.object({
    options: pagination_schema,
  }),
  getRandomTracks: z.object({
    limit: z.number().int(),
    filter: z
      .object({
        artist_id: z.number().int().optional(),
        genre_id: z.number().int().optional(),
      })
      .optional(),
    exclusions: z.array(z.number().int()),
  }),
};

/**
 * Stream a produced Opus/Ogg rendition, remuxing to CAF first if the
 * requesting client declared it can't decode Opus inside an Ogg container
 * (every WebKit-based browser — desktop Safari and all iOS browsers, which
 * are all WebKit under Apple's platform engine mandate).
 *
 * The remux is a lossless stream copy (no re-encode), so it's done
 * per-request rather than added as a cache dimension.
 *
 * @param res - HTTP response
 * @param file - cached or freshly transcoded Ogg/Opus file
 * @param wants_caf - true when the client can't play Ogg/Opus
 * @param range - raw Range request header, if any
 * @throws if the source file can't be read (propagates to the caller's
 *   cache-miss fallback)
 */
const streamOpusRendition = async (
  res: Res,
  file: { path: string; size: number },
  wants_caf: boolean,
  range: string | undefined,
) => {
  if (!wants_caf) {
    await streamAudioTrack(res, { ...file, type: "ogg" }, range);
    return;
  }

  const caf_path = await remuxToCaf(file.path);

  try {
    const caf_size = (await fs.stat(caf_path)).size;

    await streamAudioTrack(
      res,
      { path: caf_path, type: "caf", size: caf_size },
      range,
    );
  } finally {
    await fs.unlink(caf_path).catch((error) =>
      console.error("Failed to clean up temp CAF remux file", {
        caf_path,
        error,
      }),
    );
  }
};

export const TrackController = {
  castInfo: async ({
    ctx: { req },
    input: { track_ids: track_ids },
  }: Request<typeof schema.cast_info>) => {
    // Can we ensure that user is always available?
    if (req.user === undefined) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const playable_tracks = await getPlayableTracks({ id: { in: track_ids } });

    const map = Object.fromEntries(
      playable_tracks.map((track) => [track.id, track]),
    );

    return track_ids
      .filter((id) => map[id] !== undefined)
      .map((id) => {
        const track = map[id];

        // TODO: What happens if the user queues a playlist with original flac
        // audio, then sets the audio quality to high after?
        const file_type =
          req.user?.settings?.audio_quality === AudioQuality.Original
            ? track.file_type
            : "ogg";

        const MIME_TYPES: Record<string, string> = {
          mp3: "audio/mpeg",
          flac: "audio/flac",
          m4a: "audio/mp4",
          aac: "audio/aac",
          ogg: "audio/ogg",
          opus: "audio/opus",
          wav: "audio/wav",
        };

        const content_type =
          MIME_TYPES[file_type.toLowerCase()] ?? `audio/${file_type}`;
        const url = `${env.HOST}:${env.APP_PORT}/cast/media/${id}.${file_type}`;

        const token = jwt.sign(
          {
            for: req.user?.email,
            track_id: id,
            album_art_filename: map[id]?.album_art_filename,
          },
          env.SIGNING_KEY,
          { expiresIn: "1h" },
        );

        return { url, token, content_type };
      });
  },

  cover: async (req: Req, res: Res) => {
    const { filename } = req.params;
    const MAX_SIZE = 2048;

    const raw_size = req.query.size ?? "256";

    if (typeof raw_size !== "string") {
      return res
        .status(400)
        .send(
          `Invalid size provided. Expected "string" but got ${typeof raw_size}.`,
        );
    }

    const size = parseInt(raw_size);

    if (Number.isNaN(size)) {
      return res
        .status(400)
        .send(`Invalid size provided. "${req.query.size}" must be an integer.`);
    }

    if (size > MAX_SIZE) {
      return res
        .status(400)
        .send(`Invalid size provided: ${size}; must be <= ${MAX_SIZE}.`);
    }

    try {
      // For common file sizes this is only hit during development. In prod,
      // nginx will serve these
      const [data, stats] = await getAlbumFromFs(filename, size);

      if (data && stats) {
        res.writeHead(200, {
          "Content-Type": `image/${filename.split(".").at(1)}`,
          "Content-Length": stats.size,
        });

        return res.end(data);
      }
    } catch (e) {
      console.error("Failed to get track's cover:", e);
      return res.status(404).send(`Invalid album`);
    }

    const result = await db.albumArt.findUnique({ where: { filename } });

    if (!result) {
      return res.sendStatus(404);
    }

    try {
      const img = await adjustImage(result.data, { size, quality: 90 });

      res.writeHead(200, {
        "Content-Type": result.format,
        "Content-Length": img.length,
      });

      res.end(img);
    } catch (e) {
      console.error(e);

      return res.status(500).send(`Failed to load image.`);
    }
  },

  get: async ({
    input: { album_id, artist_id, genre_id, options },
  }: Request<typeof schema.get>): Promise<Array<PlayableTrack>> => {
    const { limit, page, sort, offset = DEFAULT_OFFSET } = options;

    return (
      await db.track.findMany({
        where: { album_id, artist_id, genre_id },
        select: playable_track_selection,
        take: limit,
        skip: page * limit + offset,
        orderBy: sort,
      })
    ).map((track) => ({
      ...track,
      artist: track?.artist?.name ?? null,
      album_artist: track.album_artist?.name ?? null,
      album: track.album?.title ?? null,
      album_art_filename: track.album?.album_art?.filename ?? null,
      year: track?.album?.year ?? null,
      genre: track.genre?.name ?? null,
      duration: track.duration.toNumber(),
      file_type: track.file_type,
      bitrate: track.bitrate,
      sample_rate: track.sample_rate,
      bits_per_sample: track.bits_per_sample,
    }));
  },

  getIds: async ({
    input: { album_id, artist_id, genre_id, options },
  }: Request<typeof schema.get>): Promise<Array<number>> => {
    const { limit, page, sort } = options;

    return (
      await db.track.findMany({
        where: { album_id, artist_id, genre_id },
        select: { id: true },
        take: limit,
        skip: page * limit,
        orderBy: sort,
      })
    ).map(({ id }) => id);
  },

  getTrackTiles: async ({
    input: { options },
  }: Request<typeof schema.getTrackTiles>) => {
    const { limit, page } = options;

    const tracks = await db.track.findMany({
      orderBy: { title: "asc" },
      skip: page * limit,
      take: limit,

      select: {
        id: true,
        title: true,
        album: {
          select: {
            album_art: {
              select: { filename: true },
            },
          },
        },
      },
    });

    return tracks.map(({ id, title, album }) => ({
      id,
      name: title,
      image: album?.album_art?.filename ?? null,
    }));
  },

  getRandomTracks: async ({
    input: { filter, limit, exclusions },
  }: Request<typeof schema.getRandomTracks>): Promise<Array<PlayableTrack>> => {
    // Ensure exclusions is not empty to avoid SQL syntax errors
    exclusions.push(-1);

    const whereFilters: Prisma.Sql[] = [];

    if (filter?.artist_id) {
      whereFilters.push(Prisma.sql`track.artist_id = ${filter.artist_id}`);
    }

    if (filter?.genre_id) {
      whereFilters.push(Prisma.sql`track.genre_id = ${filter.genre_id}`);
    }

    let filterSql = Prisma.sql``;
    if (whereFilters.length > 0) {
      filterSql = Prisma.sql`AND ${Prisma.join(whereFilters, ` AND `)}`;
    }

    return (await db.$queryRaw`
      WITH random_tracks AS (
        SELECT id
        FROM public."Track" track
        WHERE id NOT IN (${Prisma.join(exclusions)})
        ${filterSql}
        ORDER BY RANDOM()
      )
      SELECT
        track.id, track.title, track.path, track.number, track.duration,
        track.disc_number, track.artist_id, track.album_artist_id, track.album_id,
        artist.name AS artist, album_artist.name AS album_artist, album.title AS album,
        album_art.filename AS album_art_filename,
        album.year, genre.name AS genre, file_type, bitrate, sample_rate,
        bits_per_sample
      FROM public."Track" track
      LEFT JOIN public."Artist" artist ON track.artist_id = artist.id
      LEFT JOIN public."Artist" album_artist ON track.album_artist_id = album_artist.id
      LEFT JOIN public."Album" album ON track.album_id = album.id
      LEFT JOIN public."AlbumArt" album_art ON album.id = album_art.album_id
      LEFT JOIN public."Genre" genre ON track.genre_id = genre.id
      WHERE track.id IN (SELECT id FROM random_tracks LIMIT ${limit})`) as Array<PlayableTrack>;
  },

  /**
   * Load a track's audio for streaming, by ID
   *
   * Serves the original file as-is when the user's quality setting doesn't
   * require conversion. Otherwise resolves the setting to a rendition tier
   * and looks up a cached rendition for it; on a cache hit streams that file
   * directly. On a miss, transcodes on the fly, moves the result into the
   * rendition cache for future requests, records completion telemetry on
   * its RenditionJob, and streams the freshly-built file.
   *
   * Ogg/Opus renditions are remuxed to CAF on the way out when the request
   * carries `?container=caf` — WebKit clients (desktop Safari, all iOS
   * browsers) declare this because they can decode Opus but not inside Ogg.
   * The cache itself always stores Ogg; the remux happens per-request.
   */
  load: async (req: Req, res: Res) => {
    try {
      // Handles both /media/[123]/load and /media/[123.mp3]
      const [id_string, _ext] = req.params.id.split(".");

      const id = z.coerce.number().int().parse(id_string);
      const track = await db.track.findUnique({ where: { id } });

      if (!track) {
        throw new Error("Failed to load media file data.");
      }

      if (req.user === undefined) {
        return res.sendStatus(401);
      }

      const quality_setting =
        (
          await db.userSettings.findUnique({
            where: { user_id: req.user.id },
            select: { audio_quality: true },
          })
        )?.audio_quality ?? null;

      const stats = await fs.stat(track.path);
      const resolution = resolveTier(quality_setting ?? AudioQuality.Original, {
        file_type: track.file_type,
        effective_kbps: (stats.size * 8) / 1000 / track.duration.toNumber(),
      });

      if (!resolution.convert) {
        await streamAudioTrack(
          res,
          {
            path: track.path,
            type: track.file_type,
            size: stats.size,
          },
          req.headers.range,
        );
        return;
      }

      // WebKit (desktop Safari, all iOS browsers) can decode Opus but never
      // inside an Ogg container — the client probes this itself and asks.
      const wants_caf = req.query.container === "caf";

      // Reaching here implies resolution.convert, which resolveTier only
      // returns for a non-null, non-Original quality — so tier is set in
      // practice; the null branch is type-level honesty, not a live path
      const tier = quality_setting
        ? qualityToRenditionTier(quality_setting)
        : null;
      const cached =
        tier && track.audio_checksum
          ? await findRendition(
              track.audio_checksum,
              tier,
              resolution.target_kbps,
            )
          : null;

      if (cached) {
        try {
          await streamOpusRendition(res, cached, wants_caf, req.headers.range);
          return;
        } catch (error) {
          // The cached file vanished between findRendition's check and this
          // actually opening it (e.g. a concurrent orphan sweep) — fall
          // through to a live transcode instead of failing the request.
          console.error(
            `Cached rendition read failed for track=${id} tier=${tier}, falling back to on-the-fly conversion`,
            error,
          );
        }
      }

      try {
        console.info(
          `Rendition cache miss for track=${id} tier=${tier ?? "none"}, converting on-the-fly`,
        );

        const encode_start = new Date();
        const tmp_file = await convertAudioTrack(resolution.target_kbps, track);

        let served = { path: tmp_file, size: (await fs.stat(tmp_file)).size };

        if (tier && track.audio_checksum) {
          served = await moveRenditionIntoCache(
            track.audio_checksum,
            tier,
            tmp_file,
            resolution.target_kbps,
          );
          await markRenditionJobDone(track.audio_checksum, tier, {
            started_at: encode_start,
            source_codec: track.file_type,
            source_bitrate: track.bitrate,
            in_bytes: track.file_size,
            out_bytes: served.size,
          });
        }

        await streamOpusRendition(res, served, wants_caf, req.headers.range);

        if (served.path === tmp_file) {
          // No cache key was available (missing checksum, or an unresolved
          // tier), so moveRenditionIntoCache never ran to relocate this file
          // — clean it up ourselves instead of leaking it in /tmp forever.
          await fs.unlink(tmp_file).catch((error) =>
            console.error("Failed to clean up temp transcode file", {
              tmp_file,
              error,
            }),
          );
        }
      } catch (error) {
        console.error(`Failed to convert audio file.`, {
          id: req.params.id,
          target_kbps: resolution.target_kbps,
          error,
        });

        if (!res.headersSent) {
          res.status(500).send("Failed to convert audio file.");
        }
      }
    } catch (e) {
      console.error(e);
      res.status(500).send("Failed to load media file data.");
    }
  },
};

const getPlayableTracks = async (filter: Prisma.TrackWhereInput = {}) => {
  const tracks = await db.track.findMany({
    where: filter,
    select: playable_track_selection,
  });

  return tracks.map((track) => ({
    ...track,
    artist: track?.artist?.name ?? null,
    album: track.album?.title ?? null,
    album_art_filename: track.album?.album_art?.filename ?? null,
    year: track?.album?.year ?? null,
    genre: track.genre?.name ?? null,
    duration: track.duration.toNumber(),
  }));
};

export const playable_track_selection = {
  id: true,
  title: true,
  path: true,
  number: true,
  disc_number: true,
  duration: true,
  artist_id: true,
  album_artist_id: true,
  album_id: true,
  file_type: true,
  bitrate: true,
  sample_rate: true,
  bits_per_sample: true,
  artist: {
    select: { name: true },
  },
  album_artist: {
    select: { name: true },
  },
  album: {
    select: {
      title: true,
      album_art: true,
      year: true,
    },
  },
  genre: {
    select: {
      name: true,
    },
  },
};
