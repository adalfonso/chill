import { Response } from "express";
import fs from "fs/promises";

interface StreamFile {
  path: string;
  type: string;
  size: string;
}

/**
 * Send a file stream
 *
 * @param res - HTTP response
 * @param file - file data
 */
export const stream_file = async (res: Response, file: StreamFile) => {
  res.set("content-type", `audio/${file.type}`);
  res.set("accept-ranges", "bytes");
  res.set("content-length", file.size);

  const handle = await fs.open(file.path, "r");
  const stream = handle.createReadStream();

  stream.on("data", (chunk) => res.write(chunk));
  stream.on("error", () => res.sendStatus(500));
  stream.on("end", () => res.end());
};
