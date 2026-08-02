import fs from "node:fs/promises";

import { db } from "../data/db";
import { renditionPath } from "./RenditionCache";

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

/**
 * Delete rendition cache entries whose source checksum no longer exists in
 * the library
 *
 * Renditions are keyed by audio_checksum, not a track FK (per ADR-0006, so
 * renames don't regenerate them), so orphan detection needs an explicit
 * anti-join against live checksums rather than a relation filter.
 *
 * Must only be called after a fully completed scan, same as the other
 * orphan cleanup in this file.
 */
export const deleteOrphanRenditions = async () => {
  // Every checksum still backed by a track in the library — the set we
  // anti-join renditions and jobs against to find orphans.
  const live_checksums = new Set(
    (
      await db.track.findMany({
        where: { audio_checksum: { not: null } },
        distinct: ["audio_checksum"],
        select: { audio_checksum: true },
      })
    ).map((track) => track.audio_checksum as string),
  );

  // Cache entries whose source checksum no longer exists in the library.
  const renditions = await db.rendition.findMany({
    select: { id: true, audio_checksum: true, tier: true },
  });

  const orphans = renditions.filter(
    (r) => !live_checksums.has(r.audio_checksum),
  );

  const orphan_rendition_ids = orphans.map((r) => r.id);

  // Remove the orphaned files from disk. Best-effort: a failed unlink is
  // logged rather than thrown, so one bad file doesn't abort the rest of
  // the sweep or the DB cleanup below.
  await Promise.all(
    orphans.map((r) =>
      fs.unlink(renditionPath(r.audio_checksum, r.tier)).catch((error) =>
        console.error("Failed to delete orphaned rendition file", {
          rendition: r,
          error,
        }),
      ),
    ),
  );

  // Queued/completed conversion jobs tied to the same dead checksums.
  const jobs = await db.renditionJob.findMany({
    select: { id: true, audio_checksum: true },
  });

  const orphan_job_ids = jobs
    .filter((j) => !live_checksums.has(j.audio_checksum))
    .map((j) => j.id);

  let renditions_deleted = 0;
  let jobs_deleted = 0;

  // Delete in chunks to stay under Postgres' bind parameter limit.
  for (let i = 0; i < orphan_rendition_ids.length; i += DELETE_CHUNK_SIZE) {
    const chunk = orphan_rendition_ids.slice(i, i + DELETE_CHUNK_SIZE);
    const result = await db.rendition.deleteMany({
      where: { id: { in: chunk } },
    });
    renditions_deleted += result.count;
  }

  for (let i = 0; i < orphan_job_ids.length; i += DELETE_CHUNK_SIZE) {
    const chunk = orphan_job_ids.slice(i, i + DELETE_CHUNK_SIZE);
    const result = await db.renditionJob.deleteMany({
      where: { id: { in: chunk } },
    });
    jobs_deleted += result.count;
  }

  console.info(`  Renditions deleted: ${renditions_deleted}`);
  console.info(`  Rendition jobs deleted: ${jobs_deleted}`);
};
