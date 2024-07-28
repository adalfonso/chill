import { Request } from "@server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { pagination_schema } from "@common/schema";
import { db } from "@server/lib/data/db";

export const schema = {
  get: z.object({ id: z.number().int() }),
  getAlbumTiles: z.object({
    options: pagination_schema,
    getMetadata: z.boolean().default(false),
    filter: z
      .object({
        artist_id: z.number().int().optional(),
      })
      .optional(),
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
    const { limit, page, sort, sortBy } = options;

    const albums = await db.album.findMany({
      orderBy: { [sortBy ?? "title"]: sort },
      skip: page * limit,
      take: limit,

      where: {
        artist_id: filter?.artist_id,
      },

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
