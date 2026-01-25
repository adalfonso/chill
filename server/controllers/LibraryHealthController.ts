import { LibraryCounts } from "@common/apiTypes";
import { AlbumBitrateStats, AmbiguousArtistGenre } from "@common/types";
import { db } from "@server/lib/data/db";
import { formatFileSize } from "@server/lib/file";
import { UNKNOWN_ALBUM_TITLE } from "@server/lib/media/mappers";

export const LibraryHealthController = {
  ambiguousArtistGenre: async () => {
    return await db.$queryRaw<Array<AmbiguousArtistGenre>>`
      SELECT
        a.id,
        a.name AS artist,
        ARRAY_AGG(DISTINCT g.name) AS genres
      FROM "Artist" a
      JOIN "Track" t ON t.artist_id = a.id
      JOIN "Genre" g ON g.id = t.genre_id
      GROUP BY a.id, a.name
      HAVING COUNT(DISTINCT g.id) > 1
      ORDER BY a.name ASC`;
  },

  libraryCounts: async (): Promise<LibraryCounts> => {
    const [tracks, artists, genres, albums] = await Promise.all([
      db.track.count(),
      db.artist.count(),
      db.genre.count(),
      db.album.count(),
    ]);

    const compilations = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT a.id
        FROM "Album" a
        JOIN "Track" t ON t.album_id = a.id
        WHERE t.artist_id IS NOT NULL
        GROUP BY a.id, a.title
        HAVING COUNT(DISTINCT t.artist_id) > 3
      )`;

    const splits = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT a.id
        FROM "Album" a
        JOIN "Track" t ON t.album_id = a.id
        WHERE t.artist_id IS NOT NULL
        GROUP BY a.id, a.title
        HAVING COUNT(DISTINCT t.artist_id) > 1
          AND COUNT(DISTINCT t.artist_id) < 3
      )`;

    return {
      artists,
      albums,
      compilations: compilations[0].count,
      splits: splits[0].count,
      tracks,
      genres,
    };
  },

  librarySize: async (): Promise<string> => {
    const library_size = await db.track.aggregate({
      _sum: { file_size: true },
    });

    return formatFileSize(library_size._sum.file_size ?? 0);
  },

  lowQualityAlbums: async () => {
    return await db.$queryRaw<Array<AlbumBitrateStats>>`
      SELECT
        al.id,
        al.title,
        al.year,
        COUNT(t.id)::int AS track_count,
        SUM(t.file_size)::float8 AS total_file_size,
        SUM(t.duration)::float8 AS total_duration,
        SUM(t.file_size * 8)::float8 / NULLIF(SUM(t.duration), 0) / 1000 AS avg_bitrate_kbps
      FROM "Album" al
      JOIN "Track" t ON t.album_id = al.id
      WHERE t.file_type = 'mp3'
        AND al.title != ${UNKNOWN_ALBUM_TITLE}
      GROUP BY al.id, al.title, al.year
      HAVING SUM(t.file_size) > 0
        AND COUNT(t.id) > 1
      ORDER BY avg_bitrate_kbps ASC`;
  },

  trackCountByYear: async () => {
    return await db.$queryRaw<Array<{ year: number; count: number }>>`
      SELECT
        al.year AS year,
        COUNT(t.id)::int AS count
      FROM "Track" t
      JOIN "Album" al ON t.album_id = al.id
      WHERE al.year IS NOT NULL
      AND al.year > 0
      GROUP BY al.year
      ORDER BY al.year ASC`;
  },
};
