import fs from "node:fs/promises";
import path from "node:path";

import { RenditionTier } from "@prisma/client";
import { db } from "@server/lib/data/db";

// Container-internal path only — what's mounted here is configured at the
// Docker layer (TRANSCODED_PATH in prod, hardcoded in docker-compose.dev.yml)
// and deliberately separate from the app_data volume (see ADR-0008). Lives
// outside /opt/app/data (rather than nested under it) because a bind mount
// nested under an already-bind-mounted parent was observed to silently not
// apply under Tilt — see ADR-0008.
const rendition_dir = "/opt/app/transcoded";

/**
 * Build the on-disk path for a rendition, sharded by checksum prefix
 *
 * @param checksum - source track's audio checksum
 * @param tier - rendition quality tier
 * @returns absolute file path
 */
export const renditionPath = (checksum: string, tier: RenditionTier): string =>
  path.join(
    rendition_dir,
    checksum.slice(0, 2),
    checksum.slice(2, 4),
    `${checksum}.${tier.toLowerCase()}.ogg`,
  );

/**
 * Look up a cached rendition, verifying the file still exists on disk
 *
 * A record whose stored `target_kbps` doesn't match the caller's current
 * target is treated as stale (e.g. AUDIO_QUALITY_TARGET_KBPS changed since
 * it was built) and reported as a cache miss so it gets rebuilt.
 *
 * @param checksum - source track's audio checksum
 * @param tier - rendition quality tier
 * @param target_kbps - the bitrate the caller currently expects for this tier
 * @returns file path and size, or null if no usable cache entry exists
 */
export const findRendition = async (
  checksum: string,
  tier: RenditionTier,
  target_kbps: number,
) => {
  const record = await db.rendition.findUnique({
    where: { audio_checksum_tier: { audio_checksum: checksum, tier } },
  });

  if (!record || record.target_kbps !== target_kbps) {
    return null;
  }

  const file_path = renditionPath(checksum, tier);

  try {
    const stats = await fs.stat(file_path);

    return { path: file_path, size: stats.size };
  } catch (_e) {
    return null;
  }
};

/**
 * Move a freshly converted temp file into the rendition cache and record it
 *
 * Consumes `tmp_file_path`: the file is renamed (or copied + unlinked) into
 * the cache, so it no longer exists at its original path once this resolves.
 * Callers must not read `tmp_file_path` afterward.
 *
 * @param checksum - source track's audio checksum
 * @param tier - rendition quality tier
 * @param tmp_file_path - path of the converted file to move into the cache
 * @param target_kbps - the bitrate this file was encoded at, stored so a
 *   later config change can be detected as staleness
 * @returns final cached file path and size
 */
export const moveRenditionIntoCache = async (
  checksum: string,
  tier: RenditionTier,
  tmp_file_path: string,
  target_kbps: number,
) => {
  const file_path = renditionPath(checksum, tier);

  // A real failure here (permissions, disk full) should surface, not be
  // swallowed — the EXDEV-vs-real-error check below depends on it.
  await fs.mkdir(path.dirname(file_path), { recursive: true });

  try {
    await fs.rename(tmp_file_path, file_path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") {
      // Not a cross-device rename — a real failure (missing dir, EACCES,
      // ENOSPC). Don't mask it behind a misleading copy attempt.
      throw error;
    }

    // Cross-device rename — fall back to copy + unlink
    console.info(
      `Rendition cache: cross-device rename for checksum=${checksum} tier=${tier}, falling back to copy`,
    );
    await fs.copyFile(tmp_file_path, file_path);
    await fs.unlink(tmp_file_path);
  }

  const stats = await fs.stat(file_path);

  try {
    await db.rendition.upsert({
      where: { audio_checksum_tier: { audio_checksum: checksum, tier } },
      create: {
        audio_checksum: checksum,
        tier,
        file_size: stats.size,
        target_kbps,
      },
      update: {
        file_size: stats.size,
        target_kbps,
      },
    });
  } catch (error) {
    // The file is already in place, but with no DB row it's invisible to
    // findRendition and to deleteOrphanRenditions' DB-driven sweep, so it
    // would otherwise leak on disk forever. Clean it up and surface the
    // failure instead.
    await fs.unlink(file_path).catch(() => {});
    throw error;
  }

  console.info(
    `Rendition cache: wrote checksum=${checksum} tier=${tier} size=${stats.size} path=${file_path}`,
  );

  return { path: file_path, size: stats.size };
};
