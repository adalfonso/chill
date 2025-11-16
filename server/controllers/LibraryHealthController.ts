import { AmbiguousArtistGenre } from "@common/types";
import { db } from "@server/lib/data/db";

export const LibraryHealthController = {
  ambiguousArtistGenre: async () => {
    const artists = (await db.$queryRawUnsafe(`
  SELECT
    a.id,
    a.name AS artist,
    ARRAY_AGG(DISTINCT g.name) AS genres
  FROM "Artist" a
  JOIN "Track" t ON t.artist_id = a.id
  JOIN "Genre" g ON g.id = t.genre_id
  GROUP BY a.id, a.name
  HAVING COUNT(DISTINCT g.id) > 1;
`)) as Array<AmbiguousArtistGenre>;

    return artists;
  },
};
