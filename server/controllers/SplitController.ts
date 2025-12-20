import { Request } from "@server/trpc";
import { z } from "zod";

import { pagination_schema } from "@common/schema";
import { db } from "@server/lib/data/db";
import { SortOrder } from "@common/types";

export const schema = {
  getSplitTiles: z.object({
    options: pagination_schema,
  }),
};

export const SplitController = {
  getSplitTiles: async ({
    input: { options },
  }: Request<typeof schema.getSplitTiles>) => {
    const { limit, page, sort } = options;

    const default_album_sort = { title: SortOrder.asc };

    if (sort.length === 0) {
      sort.push(default_album_sort);
    }

    type CompilationResult = {
      id: number;
      name: string;
      image: string | null;
    };

    const compilations = await db.$queryRaw<Array<CompilationResult>>`
        SELECT
          a.id,
          a.title as name,
          art.filename as image
        FROM "Album" a
        JOIN "Track" t ON t.album_id = a.id
        LEFT JOIN "AlbumArt" art ON art.album_id = a.id
        WHERE t.artist_id IS NOT NULL
        GROUP BY a.id, art.filename
        HAVING COUNT(DISTINCT t.artist_id) > 1
          AND COUNT(DISTINCT t.artist_id) < 3
        ORDER BY a.title ASC
        LIMIT ${limit}
        OFFSET ${page * limit}`;

    return compilations;
  },
};
