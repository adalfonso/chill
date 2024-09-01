import { Request } from "@server/trpc";
import { z } from "zod";

import { pagination_schema } from "@common/schema";
import { db } from "@server/lib/data/db";
import { Prisma } from "@prisma/client";
import { MediaTileData, SortOrder } from "@common/types";

export const schema = {
  get: z.object({ id: z.number().int() }),
  getGenreTiles: z.object({ options: pagination_schema }),
};

export const GenreController = {
  get: async ({ input: { id } }: Request<typeof schema.get>) => {
    return await db.genre.findUnique({
      where: { id },
    });
  },
  getGenreTiles: async ({
    input: { options },
  }: Request<typeof schema.getGenreTiles>) => {
    const { limit, page } = options;

    const sort_order = Prisma.sql([SortOrder.asc]);

    return (await db.$queryRaw`
      WITH random_album_art AS (
        SELECT genre.id, genre.name, album_art.filename AS image,
          ROW_NUMBER() OVER (
            PARTITION BY genre.id
            ORDER BY album_art.filename IS NULL, RANDOM()
          ) AS row_num
        FROM public."Genre" genre
        JOIN public."Track" track ON genre.id = track.genre_id
        LEFT JOIN public."Album" album ON track.album_id = album.id
        LEFT JOIN public."AlbumArt" album_art ON album.id = album_art.album_id
        GROUP BY genre.id, album_art.filename
      )
      SELECT id, name, image
      FROM random_album_art
      WHERE row_num = 1
      ORDER BY name ${sort_order}
      OFFSET ${page * limit}
      LIMIT ${limit}`) as Array<MediaTileData>;
  },
};
