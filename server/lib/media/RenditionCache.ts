import fs from "node:fs/promises";
import path from "node:path";

import { RenditionTier } from "@prisma/client";
import { makeDirIfNotExists } from "@server/lib/file";
import { db } from "@server/lib/data/db";

const rendition_dir = "/opt/app/data/transcoded";

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
 * @param checksum - source track's audio checksum
 * @param tier - rendition quality tier
 * @returns file path and size, or null if no usable cache entry exists
 */
export const findRendition = async (checksum: string, tier: RenditionTier) => {
  const record = await db.rendition.findUnique({
    where: { audio_checksum_tier: { audio_checksum: checksum, tier } },
  });

  if (!record) {
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
 * @returns final cached file path and size
 */
export const moveRenditionIntoCache = async (
  checksum: string,
  tier: RenditionTier,
  tmp_file_path: string,
) => {
  const file_path = renditionPath(checksum, tier);

  await makeDirIfNotExists(rendition_dir);
  await makeDirIfNotExists(path.dirname(path.dirname(file_path)));
  await makeDirIfNotExists(path.dirname(file_path));

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

  await db.rendition.upsert({
    where: { audio_checksum_tier: { audio_checksum: checksum, tier } },
    create: {
      audio_checksum: checksum,
      tier,
      file_size: stats.size,
    },
    update: {
      file_size: stats.size,
    },
  });

  console.info(
    `Rendition cache: wrote checksum=${checksum} tier=${tier} size=${stats.size} path=${file_path}`,
  );

  return { path: file_path, size: stats.size };
};
