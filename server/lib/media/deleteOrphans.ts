import { db } from "../data/db";

export const deleteOrphans = async () => {
  // Step 1: delete albums, artists, and genres with no tracks
  const [albumResult, artistResult, genreResult] = await db.$transaction([
    db.album.deleteMany({ where: { tracks: { none: {} } } }),
    db.artist.deleteMany({ where: { tracks: { none: {} } } }),
    db.genre.deleteMany({ where: { tracks: { none: {} } } }),
  ]);

  console.info("🧹 Cleanup complete:");
  console.info(`  Albums deleted:     ${albumResult.count}`);
  console.info(`  Artists deleted:    ${artistResult.count}`);
  console.info(`  Genres deleted:     ${genreResult.count}`);
};
