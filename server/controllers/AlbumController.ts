import { Request } from "@server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { pagination_schema } from "@common/schema";
import { db } from "@server/lib/data/db";
import { SortOrder } from "@common/types";

export const schema = {
  get: z.object({ id: z.number().int() }),
  getAlbumTiles: z.object({
    getMetadata: z.boolean().default(false),
    filter: z
      .object({
        artist_id: z.number().int().optional(),
      })
      .optional(),
    options: pagination_schema,
  }),
};

export const AlbumController = {
  get: async ({ input: { id } }: Request<typeof schema.get>) => {
    const album = await db.album.findUnique({
      where: { id },

      include: {
        album_art: {
          select: { filename: true },
        },
        artist: {
          select: { name: true },
        },
      },
    });

    if (!album) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return album;
  },
  getAlbumTiles: async ({
    input: { options, filter, getMetadata },
  }: Request<typeof schema.getAlbumTiles>) => {
    const { limit, page, sort } = options;

    const default_album_sort = { title: SortOrder.asc };

    if (sort.length === 0) {
      sort.push(default_album_sort);
    }

    // 1) Get album IDs from the artist's tracks

    let albumIds: number[] = [];

    if (filter?.artist_id) {
      const trackAlbums = await db.track.findMany({
        where: {
          artist_id: filter.artist_id,
          album_id: { not: null },
        },
        select: { album_id: true },
        distinct: ["album_id"],
      });

      albumIds = trackAlbums.map((t) => t.album_id!);

      // No albums? Return early
      if (albumIds.length === 0) return [];
    }

    // 2) Load the albums, sorted + paginated

    const albums = await db.album.findMany({
      where: albumIds.length > 0 ? { id: { in: albumIds } } : {},
      orderBy: sort,
      skip: page * limit,
      take: limit,

      select: {
        id: true,
        title: true,
        album_art: {
          select: { filename: true },
        },
        year: getMetadata,
      },
    });

    return albums.map(({ id, title, album_art, year }) => ({
      id,
      name: title,
      image: album_art?.filename,

      ...(getMetadata ? { data: { year } } : {}),
    }));
  },
};
