import fs from "node:fs/promises";
import path from "node:path";

import { makeDirIfNotExists } from "@server/lib/file";
import { adjustImage } from "./ImageAdjust";
import { db } from "@server/lib/data/db";

const common_album_art_sizes = [48, 160, 176, 256, 500];
const data_dir = `/opt/app/data`;
const album_art_dir = `/opt/app/data/albumart`;

/**
 * Load album art from the filesystem at a certain size
 *
 * @param filename - album art filename, e.g. 12345.jpg
 * @param size - height/width preference for the image
 * @returns image data and file stat
 */
export const getAlbumFromFs = async (filename: string, size: number) => {
  const album_art_filename_pattern = /^\d+\.(jpe?g|png|gif)$/;

  if (!album_art_filename_pattern.test(filename)) {
    throw new Error(`Invalid album art filename, "${filename}"`);
  }

  if (!common_album_art_sizes.includes(size)) {
    return [null, null];
  }

  const file_path = path.join(album_art_dir, size.toString(), filename);

  try {
    return await Promise.all([fs.readFile(file_path), fs.stat(file_path)]);
  } catch (_e) {
    return [null, null];
  }
};

/**
 * Determine which cached sizes are missing or stale for an album art record
 *
 * A cached file is stale when the art row is newer than the file — changed
 * art is recreated by the crawler, refreshing the row's updated_at.
 *
 * @param art - album art record
 * @returns sizes that need to be (re)rendered
 */
const getStaleSizes = async (art: {
  album_id: number;
  format: string;
  updated_at: Date;
}) => {
  const checks = await Promise.all(
    common_album_art_sizes.map(async (size) => {
      const file_path = path.join(
        album_art_dir,
        size.toString(),
        `${art.album_id}.${art.format.split("/").at(1)}`,
      );

      try {
        const stat = await fs.stat(file_path);
        return stat.mtime >= art.updated_at ? null : size;
      } catch (_e) {
        return size;
      }
    }),
  );

  return checks.filter((size): size is number => size !== null);
};

// Cache album art to the file system for any art that is missing or stale
export const cacheAlbumArt = async () => {
  const start = new Date();
  console.info("Caching album art...");

  // Make sure the main dirs exists
  await makeDirIfNotExists(data_dir);
  await makeDirIfNotExists(album_art_dir);

  // Mae dirs for each cached size
  await Promise.all(
    common_album_art_sizes.map((size) =>
      makeDirIfNotExists(path.join(album_art_dir, size.toString())),
    ),
  );

  // Metadata only — blobs are fetched individually for stale records
  const all_art = await db.albumArt.findMany({
    select: {
      id: true,
      album_id: true,
      format: true,
      updated_at: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  let records_processed = 0;

  for (const art of all_art) {
    const stale_sizes = await getStaleSizes(art);

    if (stale_sizes.length === 0) {
      continue;
    }

    const blob = await db.albumArt.findUnique({
      where: { id: art.id },
      select: { data: true },
    });

    if (blob === null) {
      continue;
    }

    records_processed++;

    await Promise.all(
      stale_sizes.map(async (size) => {
        try {
          return fs.writeFile(
            path.join(
              album_art_dir,
              size.toString(),
              `${art.album_id}.${art.format.split("/").at(1)}`,
            ),
            await adjustImage(blob.data, { size, quality: 90 }),
          );
        } catch (error) {
          console.error(`Failed to cache album art:`, {
            id: art.album_id,
            size,
            error,
          });
        }
      }),
    );
  }

  console.info(
    `Album art cached. Took ${
      (new Date().valueOf() - start?.valueOf()) / 1000
    } seconds for ${records_processed} of ${all_art.length} records`,
  );
};
