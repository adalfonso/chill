import { Track } from "@prisma/client";
import { randomBytes } from "node:crypto";

import { spawnChild } from "./process";

/**
 * Convert an audio file to Opus (Ogg container) at a target bitrate
 *
 * @param target_kbps - target Opus VBR bitrate, from resolveTier
 * @param track - track document
 * @returns filename of converted audio file
 */
export const convert = async (target_kbps: number, track: Track) => {
  const tmp_file = `/tmp/${randomBytes(16).toString("hex")}.ogg`;
  const args = [
    "-y",
    "-i",
    track.path,
    // Audio stream only — embedded cover art is carried as a "video" stream
    // that ffmpeg would otherwise try (and fail) to fit into Ogg/Opus.
    "-map",
    "0:a:0",
    "-c:a",
    "libopus",
    "-b:a",
    `${target_kbps}k`,
    "-vbr",
    "on",
    "-application",
    "audio",
    tmp_file,
  ];
  const start = new Date();

  console.info(`Starting encode: ${args}`);

  await spawnChild("ffmpeg", args);

  console.info(
    `Encoding finished, took: ${new Date().valueOf() - start.valueOf()}`,
  );

  return tmp_file;
};
