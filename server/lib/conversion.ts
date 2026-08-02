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

/**
 * Losslessly remux an Ogg/Opus file into a CAF container
 *
 * WebKit (desktop Safari, and every iOS browser — Chrome/Firefox/Edge on iOS
 * are all WebKit under Apple's platform engine mandate) can decode Opus but
 * never inside an Ogg container. This repackages the existing Opus
 * bitstream — `-c:a copy`, no re-encode — into a container WebKit accepts.
 *
 * @param ogg_path - path to a source Ogg/Opus file
 * @returns filename of the remuxed CAF file
 */
export const remuxToCaf = async (ogg_path: string) => {
  const tmp_file = `/tmp/${randomBytes(16).toString("hex")}.caf`;
  const args = ["-y", "-i", ogg_path, "-c:a", "copy", tmp_file];
  const start = new Date();

  console.info(`Starting remux to CAF: ${args}`);

  await spawnChild("ffmpeg", args);

  console.info(
    `Remux finished, took: ${new Date().valueOf() - start.valueOf()}`,
  );

  return tmp_file;
};
