import fs from "node:fs/promises";
import path from "node:path";

import { makeDirIfNotExists } from "@server/lib/file";
import { adjustImage } from "./ImageAdjust";
import { db } from "@server/lib/data/db";

const common_album_art_sizes = [36, 160, 176, 256];
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
    throw new Error("Invalid album art filename");
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

// Cache all album art to the file system
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

  const chunk = 25;
  let page = 0;
  let more_results = true;
  let records_processed = 0;

  while (more_results) {
    console.info(`Caching page ${page} of album art...`);
    const album_art = await db.albumArt.findMany({
      select: {
        album_id: true,
        format: true,
        data: true,
      },

      orderBy: {
        id: "asc",
      },
      skip: page * chunk,
      take: chunk,
    });

    page++;
    records_processed += album_art.length;

    if (!album_art.length) {
      more_results = false;
    }

    for (const art of album_art) {
      await Promise.all(
        common_album_art_sizes.map(async (size) => {
          try {
            return fs.writeFile(
              path.join(
                album_art_dir,
                size.toString(),
                `${art.album_id}.${art.format.split("/").at(1)}`,
              ),
              await adjustImage(art.data, { size, quality: 80 }),
            );
          } catch (error) {
            console.error(`Failed to cache album art:`, {
              id: art.album_id,
              size,
            });
          }
        }),
      );
    }
  }

  console.info(
    `Album art cahed. Took ${
      (new Date().valueOf() - start?.valueOf()) / 1000
    } seconds for ${records_processed} records`,
  );
};
