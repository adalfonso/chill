import { AmbiguousArtistGenre } from "@common/types";
import { db } from "@server/lib/data/db";
import { formatFileSize } from "@server/lib/file";

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
  HAVING COUNT(DISTINCT g.id) > 1
  ORDER BY a.name ASC;
`)) as Array<AmbiguousArtistGenre>;

    return artists;
  },

  libraryStats: async () => {
    const [tracks, artists, genres, library_size] = await Promise.all([
      db.track.count(),
      db.artist.count(),
      db.genre.count(),
      db.track.aggregate({ _sum: { file_size: true } }),
    ]);

    return {
      library_size: formatFileSize(library_size._sum.file_size ?? 0),
      tracks,
      artists,
      genres,
    };
  },
};
