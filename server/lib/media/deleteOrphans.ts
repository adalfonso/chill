import { db } from "../data/db";

/**
 * Max ids per delete statement — every id in an IN list is a bind parameter,
 * and Postgres caps statements at 65,535 parameters
 */
const DELETE_CHUNK_SIZE = 1000;

/**
 * Delete tracks whose files no longer exist on disk
 *
 * Must only be called after a fully completed scan — a partial traversal
 * would misidentify unseen tracks as orphans.
 *
 * @param seen_paths - every media file path observed during the scan
 */
export const deleteOrphanTracks = async (seen_paths: Set<string>) => {
  const tracks = await db.track.findMany({
    select: { id: true, path: true },
  });

  const orphan_ids = tracks.reduce<Array<number>>((carry, track) => {
    if (!seen_paths.has(track.path)) {
      carry.push(track.id);
    }

    return carry;
  }, []);

  for (let i = 0; i < orphan_ids.length; i += DELETE_CHUNK_SIZE) {
    const chunk = orphan_ids.slice(i, i + DELETE_CHUNK_SIZE);

    await db.$transaction([
      db.playlistTrack.deleteMany({ where: { track_id: { in: chunk } } }),
      db.track.deleteMany({ where: { id: { in: chunk } } }),
    ]);
  }

  console.info(`  Tracks deleted:     ${orphan_ids.length}`);
};

export const deleteOrphans = async () => {
  const [albumResult, artistResult, genreResult] = await db.$transaction([
    db.album.deleteMany({ where: { tracks: { none: {} } } }),
    db.artist.deleteMany({
      where: {
        AND: [
          { tracks: { none: {} } },
          { album_artist_tracks: { none: {} } },
          { albums: { none: {} } },
        ],
      },
    }),
    db.genre.deleteMany({ where: { tracks: { none: {} } } }),
  ]);

  console.info("🧹 Cleanup complete:");
  console.info(`  Albums deleted:     ${albumResult.count}`);
  console.info(`  Artists deleted:    ${artistResult.count}`);
  console.info(`  Genres deleted:     ${genreResult.count}`);
};
