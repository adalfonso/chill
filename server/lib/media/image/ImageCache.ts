import fs from "node:fs/promises";
import path from "node:path";

import { makeDirIfNotExists } from "@server/lib/file";
import { adjustImage } from "./ImageAdjust";
import { db } from "@server/lib/data/db";

const common_album_art_sizes = [36, 160, 176, 256];
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
    return null;
  }

  const file_path = path.join(album_art_dir, size.toString(), filename);

  return {
    data: await fs.readFile(file_path),
    stats: await fs.stat(file_path),
  };
};

// Cache all album art to the file system
export const cacheAlbumArt = async () => {
  const start = new Date();
  console.info("Caching album art...");

  // TODO: batch this
  const album_art = await db.albumArt.findMany({
    select: {
      album_id: true,
      format: true,
      data: true,
    },
  });

  // Make sure the main dir exists
  await makeDirIfNotExists(album_art_dir);

  // Mae dirs for each cached size
  await Promise.all(
    common_album_art_sizes.map((size) =>
      makeDirIfNotExists(path.join(album_art_dir, size.toString())),
    ),
  );

  for (const art of album_art) {
    await Promise.all(
      common_album_art_sizes.map(async (size) =>
        fs.writeFile(
          path.join(
            album_art_dir,
            size.toString(),
            `${art.album_id}.${art.format.split("/").at(1)}`,
          ),
          await adjustImage(art.data, { size, quality: 80 }),
        ),
      ),
    );
  }

  console.info(
    `Album art cahed. Took ${
      (new Date().valueOf() - start?.valueOf()) / 1000
    } seconds for ${album_art.length} records`,
  );
};
