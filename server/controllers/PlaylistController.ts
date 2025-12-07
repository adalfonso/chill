import { Playlist } from "@prisma/client";
import { Request } from "@server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { PlaylistWithCount, SortOrder } from "@common/types";
import { db } from "@server/lib/data/db";
import { pagination_schema } from "@common/schema";
import { playable_track_selection } from "./TrackController";

export const schema = {
  create: z.object({
    title: z.string(),
    track_ids: z.array(z.number().int()).optional(),
  }),

  get: z.object({ id: z.number().int() }),

  index: z.object({ options: pagination_schema }),

  search: z.object({ query: z.string() }),

  tracks: z.object({
    id: z.number().int(),
    options: pagination_schema,
  }),

  update: z.object({
    id: z.number().int(),
    track_ids: z.array(z.number().int()),
  }),
};

export const PlaylistController = {
  create: async ({
    input: { title, track_ids = [] },
  }: Request<typeof schema.create>) => {
    try {
      const playlist = await db.playlist.create({ data: { title } });

      await db.playlistTrack.createMany({
        data: track_ids.map((track_id, index) => ({
          playlist_id: playlist.id,
          index,
          track_id,
        })),
      });
    } catch (e) {
      console.error(e);

      if ((e as Error).message.match(/Unique constraint failed/)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Playlist title is already taken.",
        });
      }

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },

  get: async ({
    input: { id },
  }: Request<typeof schema.get>): Promise<Playlist> => {
    const playlist = await db.playlist.findUnique({
      where: { id },
    });

    if (playlist === null) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return playlist;
  },

  index: async ({
    input: {
      options: { limit = Infinity, page = 0, sort },
    },
  }: Request<typeof schema.index>): Promise<Array<PlaylistWithCount>> => {
    const default_playlist_sort = { created_at: SortOrder.asc };

    if (sort.length === 0) {
      sort.push(default_playlist_sort);
    }

    const playlists = await db.playlist.findMany({
      orderBy: sort,
      skip: page > 0 ? page * limit : 0,
      take: limit,
    });

    return await addTrackCounts(playlists);
  },

  search: async ({ input: { query } }: Request<typeof schema.search>) => {
    // TODO: Use search engine for this at some point
    const playlists = await db.playlist.findMany({
      where: {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
    });

    return await addTrackCounts(playlists);
  },

  tracks: async ({
    input: {
      id,
      options: { limit, page, sort },
    },
  }: Request<typeof schema.tracks>) => {
    try {
      const playlist = db.playlist.findUnique({ where: { id } });

      if (playlist === null) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const default_playlist_track_sort = { index: SortOrder.asc };

      if (sort.length === 0) {
        sort.push(default_playlist_track_sort);
      }

      const playlist_items = await db.playlistTrack.findMany({
        where: { playlist_id: id },
        orderBy: sort,
        skip: page > 0 ? page * limit : 0,
        take: limit,
        select: {
          track: {
            select: playable_track_selection,
          },
        },
      });

      return playlist_items.map(({ track }) => ({
        ...track,
        artist: track?.artist?.name ?? null,
        album_artist: track?.album_artist?.name ?? null,
        album: track.album?.title ?? null,
        album_art_filename: track.album?.album_art?.filename ?? null,
        year: track?.album?.year ?? null,
        genre: track.genre?.name ?? null,
        duration: track.duration.toNumber(),
      }));
    } catch (e) {
      console.error("Failed to get Playlist tracks: ", e);

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },

  update: async ({
    input: { id, track_ids = [] },
  }: Request<typeof schema.update>) => {
    const playlist = await db.playlist.findUnique({ where: { id } });

    if (!playlist) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const playlist_tail = await db.playlistTrack.findFirst({
      where: { playlist_id: id },
      orderBy: { index: "desc" },
    });

    await db.playlistTrack.createMany({
      data: track_ids.map((track_id, index) => ({
        playlist_id: playlist.id,
        index: index + (playlist_tail?.index ?? 0),
        track_id,
      })),
    });
  },
};

/**
 * Add the track count to an array of playlists
 *
 * @param playlists array of playlists
 * @returns updated playlists with counts
 */
const addTrackCounts = async (playlists: Array<Playlist>) => {
  const playlist_counts = await db.playlistTrack.groupBy({
    by: ["playlist_id"],
    where: {
      playlist_id: { in: playlists.map(({ id }) => id) },
    },
    _count: {
      id: true,
    },
  });

  const playlist_count_map = Object.fromEntries(
    playlist_counts.map(({ playlist_id, _count }) => [playlist_id, _count.id]),
  );

  return playlists.map((playlist) => ({
    ...playlist,
    track_count: playlist_count_map[playlist.id] ?? 0,
  }));
};
