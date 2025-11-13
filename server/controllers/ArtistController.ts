import { Request } from "@server/trpc";
import { z } from "zod";

import { pagination_schema } from "@common/schema";
import { db } from "@server/lib/data/db";
import { Prisma } from "@prisma/client";
import { MediaTileData, SortOrder } from "@common/types";

export const schema = {
  get: z.object({ id: z.number().int() }),
  getArtistTiles: z.object({ options: pagination_schema }),
  getArtistTilesByGenre: z.object({
    options: pagination_schema,
    genre_id: z.number().int(),
  }),
};

export const ArtistController = {
  get: async ({ input: { id } }: Request<typeof schema.get>) => {
    return await db.artist.findUnique({
      where: { id },
    });
  },
  getArtistTiles: async ({
    input: { options },
  }: Request<typeof schema.getArtistTiles>) => {
    const { limit, page, sort } = options;

    const default_artist_sort = { name: SortOrder.asc };

    if (sort.length === 0) {
      sort.push(default_artist_sort);
    }

    const artists = await db.artist.findMany({
      orderBy: sort,
      skip: page * limit,
      take: limit,

      select: {
        id: true,
        name: true,
        albums: {
          select: {
            album_art: {
              select: { filename: true },
            },
          },
        },
      },
    });

    console.log(JSON.stringify(artists, null, 2));

    return artists.map(({ id, name, albums }) => ({
      id,
      name,
      image: albums.find((album) => album?.album_art?.filename)?.album_art
        ?.filename,
    }));
  },

  getArtistTilesByGenre: async ({
    input: { options, genre_id },
  }: Request<typeof schema.getArtistTilesByGenre>) => {
    const { limit, page } = options;

    const sort_order = Prisma.sql([SortOrder.asc]);

    return (await db.$queryRaw`
      WITH random_album_art AS (
        SELECT artist.id, artist.name, album_art.filename AS image,
          ROW_NUMBER() OVER (
            PARTITION BY artist.id
            ORDER BY album_art.filename IS NULL, RANDOM()
          ) AS row_num
        FROM public."Track" track
        JOIN public."Artist" artist ON track.artist_id = artist.id
        LEFT JOIN public."Album" album ON track.album_id = album.id
        LEFT JOIN public."AlbumArt" album_art ON album.id = album_art.album_id
        WHERE track.genre_id = ${genre_id}
        GROUP BY artist.id, album_art.filename
      )
      SELECT id, name, image
      FROM random_album_art
      WHERE row_num = 1
      ORDER BY name ${sort_order}
      OFFSET ${page * limit}
      LIMIT ${limit}`) as Array<MediaTileData>;
  },
};
