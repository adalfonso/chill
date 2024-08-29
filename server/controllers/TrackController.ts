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
import { stream_file as streamAudioTrack } from "@server/lib/stream";
import { adjustImage } from "@server/lib/media/image/ImageAdjust";
import { getFileTypeFromPath } from "@common/commonUtils";
import { env } from "@server/init";
import { getAlbumFromFs } from "@server/lib/media/image/ImageCache";

export const schema = {
  cast_info: z.object({
    track_ids: z.array(z.number().int()),
  }),
  getByAlbumAndOrArtist: z.object({
    album_id: z.number().int().optional(),
    artist_id: z.number().int().optional(),
  }),
  getByGenre: z.object({
    genre_id: z.number().int(),
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
      return res.status(404).send(`Invalid album`);
    }

    const result = await db.albumArt.findUnique({ where: { filename } });

    if (!result) {
      return res.sendStatus(404);
    }

    try {
      const img = await adjustImage(result.data, { size, quality: 50 });

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

  getByAlbumAndOrArtist: async ({
    input: { album_id, artist_id },
  }: Request<typeof schema.getByAlbumAndOrArtist>): Promise<
    Array<PlayableTrack>
  > => {
    if (!album_id && !artist_id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Must provide album_id and/or artist_id",
      });
    }

    return (
      await db.track.findMany({
        where: { album_id, artist_id },
        select: playable_track_selection,
      })
    ).map((track) => ({
      ...track,
      artist: track?.artist?.name ?? null,
      album: track.album?.title ?? null,
      album_art_filename: track.album?.album_art?.filename ?? null,
      year: track?.album?.year ?? null,
      genre: track.genre?.name ?? null,
      duration: track.duration.toNumber(),
    }));
  },

  getByGenre: async ({
    input: { genre_id },
  }: Request<typeof schema.getByGenre>): Promise<Array<PlayableTrack>> => {
    return (
      await db.track.findMany({
        where: { genre_id },
        select: playable_track_selection,
      })
    ).map((track) => ({
      ...track,
      artist: track?.artist?.name ?? null,
      album: track.album?.title ?? null,
      album_art_filename: track.album?.album_art?.filename ?? null,
      year: track?.album?.year ?? null,
      genre: track.genre?.name ?? null,
      duration: track.duration.toNumber(),
    }));
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
        album.title AS album, album_art.filename AS album_art_filename
      FROM public."Track" track
      LEFT JOIN public."Artist" artist ON track.artist_id = artist.id
      LEFT JOIN public."Album" album ON track.album_id = album.id
      LEFT JOIN public."AlbumArt" album_art ON album.id = album_art.album_id
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
        } catch (e) {
          console.error(`Failed to convert audio file.`, {
            id: req.params.id,
            quality_preference_kbps: mp3_quality_preference_kbps,
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
