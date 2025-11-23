import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Request as Req, Response as Res } from "express";
import fs from "node:fs/promises";
import jwt from "jsonwebtoken";

import { AudioQualityBitrate, PlayableTrack } from "@common/types";
import { Request } from "@server/trpc";
import { db } from "@server/lib/data/db";
import { AudioQuality, Prisma } from "@prisma/client";
import { convert as convertAudioTrack } from "@server/lib/conversion";
import { stream_file as streamAudioTrack } from "@server/lib/io/stream";
import { adjustImage } from "@server/lib/media/image/ImageAdjust";
import { getFileTypeFromPath } from "@common/commonUtils";
import { env } from "@server/init";
import { getAlbumFromFs } from "@server/lib/media/image/ImageCache";
import { pagination_schema } from "@common/schema";

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
  getRandomTracks: z.object({
    limit: z.number().int(),
    exclusions: z.array(z.number().int()),
  }),
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
        // audio, then sets the audio quality to medium after?
        const file_type =
          req.user?.settings?.audio_quality === AudioQuality.Original
            ? getFileTypeFromPath(track.path)
            : "mp3";

        const content_type = `audio/${file_type}`;
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
    const { limit, page, sort } = options;

    return (
      await db.track.findMany({
        where: { album_id, artist_id, genre_id },
        select: playable_track_selection,
        take: limit,
        skip: page * limit,
        orderBy: sort,
      })
    ).map((track) => ({
      ...track,
      artist: track?.artist?.name ?? null,
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

  getRandomTracks: async ({
    input: { limit, exclusions },
  }: Request<typeof schema.getRandomTracks>): Promise<Array<PlayableTrack>> => {
    exclusions.push(9e16);

    return (await db.$queryRaw`
      WITH random_tracks AS (
        SELECT id
        FROM public."Track" track
        WHERE id NOT IN (${Prisma.join(exclusions)})
        ORDER BY RANDOM()
      )
      SELECT
        track.id, track.title, track.path, track.number, track.duration,
        track.artist_id, track.album_id, artist.name AS artist,
        album.title AS album, album_art.filename AS album_art_filename,
        album.year, genre.name AS genre, file_type, bitrate, sample_rate,
        bits_per_sample

      FROM public."Track" track
      LEFT JOIN public."Artist" artist ON track.artist_id = artist.id
      LEFT JOIN public."Album" album ON track.album_id = album.id
      LEFT JOIN public."AlbumArt" album_art ON album.id = album_art.album_id
      LEFT JOIN public."Genre" genre ON track.genre_id = genre.id
      WHERE track.id IN (SELECT id FROM random_tracks LIMIT ${limit})`) as Array<PlayableTrack>;
  },

  /** Load a media file from is ID */
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
      const mp3_quality_preference_kbps =
        AudioQualityBitrate[quality_setting ?? AudioQuality.Medium];

      const full_quality_kbps =
        (stats.size * 8) / 1000 / track.duration.toNumber();
      const do_convert =
        quality_setting !== AudioQuality.Original &&
        parseInt(mp3_quality_preference_kbps) < full_quality_kbps;

      if (do_convert) {
        try {
          const tmp_file = await convertAudioTrack(
            mp3_quality_preference_kbps,
            track,
          );
          const stats = await fs.stat(tmp_file);

          await streamAudioTrack(res, {
            path: tmp_file,
            type: "mp3",
            size: stats.size.toString(),
          });
        } catch (error) {
          console.error(`Failed to convert audio file.`, {
            id: req.params.id,
            quality_preference_kbps: mp3_quality_preference_kbps,
            error,
          });
        }
      } else {
        await streamAudioTrack(res, {
          path: track.path,
          type: track.file_type,
          size: stats.size.toString(),
        });
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
  duration: true,
  artist_id: true,
  album_id: true,
  file_type: true,
  bitrate: true,
  sample_rate: true,
  bits_per_sample: true,
  artist: {
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
