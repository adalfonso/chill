import { MediaDocument } from "../../common/autogen";
import { randomBytes } from "node:crypto";
import { spawnChild } from "./process.mjs";

// mp3 vbr
export const quality_map = {
  96: -8,
  112: -7,
  120: -6,
  130: -5,
  160: -4,
  170: -3,
  190: -2,
  220: -1,
  240: 0,
};

/**
 * Convert an audio file
 *
 * @param quality - quality modifier
 * @param media - media mongo doc
 * @returns filename of converted audio file
 */
export const convert = async (quality_kbps: number, media: MediaDocument) => {
  const quality = quality_map[quality_kbps];
  const tmp_file = `/tmp/${randomBytes(16).toString("hex")}.mp3`;
  const args = [media.path, "-C", quality, tmp_file];
  const start = new Date();

  console.info(`Starting encode: ${args}`);

  await spawnChild("sox", args);

  console.info(
    `Encoding finished, took: ${new Date().valueOf() - start.valueOf()}`,
  );

  return tmp_file;
};
