import { Media } from "../../common/models/Media.js";
import { randomBytes } from "node:crypto";
import { spawnChild } from "./process.mjs";

type Mp3Quality = "85" | "115" | "165" | "190" | "245" | "original";

// mp3 vbr
export const quality_map: Record<Mp3Quality, number> = {
  85: -8, // trash
  115: -6, // low
  165: -4, // medium
  190: -2, // standard
  245: 0, // extreme
  original: 0, // extreme
};

/**
 * Convert an audio file
 *
 * @param quality - quality modifier
 * @param media - media mongo doc
 * @returns filename of converted audio file
 */
export const convert = async (quality_kbps: Mp3Quality, media: Media) => {
  // TODO: This should not be needed. Let's make types better and remove original
  // quality from the quality_map and Mp3Quality types
  if (quality_kbps === "original") {
    throw new Error(
      "Should not convert audio when original quality is requested",
    );
  }

  const quality = quality_map[quality_kbps];
  const tmp_file = `/tmp/${randomBytes(16).toString("hex")}.mp3`;
  const args = [media.path, "-C", quality.toString(), tmp_file];
  const start = new Date();

  console.info(`Starting encode: ${args}`);

  await spawnChild("sox", args);

  console.info(
    `Encoding finished, took: ${new Date().valueOf() - start.valueOf()}`,
  );

  return tmp_file;
};
