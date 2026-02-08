import { Response } from "express";
import fs from "node:fs/promises";

type StreamFile = {
  path: string;
  type: string;
  size: string;
};

const MIME_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
};

/**
 * Send a file stream
 *
 * @param res - HTTP response
 * @param file - file data
 */
export const stream_file = async (res: Response, file: StreamFile) => {
  const mimeType = MIME_TYPES[file.type.toLowerCase()] ?? `audio/${file.type}`;
  res.set("content-type", mimeType);
  res.set("accept-ranges", "bytes");
  res.set("content-length", file.size);

  const handle = await fs.open(file.path, "r");
  const stream = handle.createReadStream();

  stream.on("data", (chunk) => res.write(chunk));
  stream.on("error", () => res.sendStatus(500));
  stream.on("end", () => res.end());
};
