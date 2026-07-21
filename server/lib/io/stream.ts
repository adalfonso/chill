import { Response } from "express";
import { createReadStream } from "node:fs";

import { Maybe } from "@common/types";

type StreamFile = {
  path: string;
  type: string;
  /** Total file size in bytes */
  size: number;
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

type ByteRange = { start: number; end: number };

/**
 * Parse a single HTTP `Range` header of the form `bytes=start-end`.
 *
 * Supports open-ended (`bytes=500-`) and suffix (`bytes=-500`) ranges.
 *
 * @param header - raw Range header value
 * @param size - total file size in bytes
 * @returns the resolved byte range, or null if the header is absent/unsatisfiable
 */
export const parseRange = (header: string, size: number): Maybe<ByteRange> => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());

  if (!match) {
    return null;
  }

  const [, raw_start, raw_end] = match;

  if (raw_start === "" && raw_end === "") {
    return null;
  }

  // Suffix range (`bytes=-N`): the final N bytes. Always in-bounds.
  if (raw_start === "") {
    const suffix = parseInt(raw_end, 10);

    if (Number.isNaN(suffix) || suffix <= 0) {
      return null;
    }

    return { start: Math.max(size - suffix, 0), end: size - 1 };
  }

  // Explicit range (`bytes=start-` or `bytes=start-end`).
  const start = parseInt(raw_start, 10);
  const end =
    raw_end === "" ? size - 1 : Math.min(parseInt(raw_end, 10), size - 1);

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start > end ||
    start >= size
  ) {
    return null;
  }

  return { start, end };
};

/**
 * Send a file as a stream, honoring HTTP range requests.
 *
 * When the client sends a satisfiable `Range` header we reply `206 Partial
 * Content` with only the requested_range byte window; otherwise the whole file is sent
 * as `200`. Piping the read stream preserves backpressure.
 *
 * A read error that happens before any bytes are sent (e.g. the file
 * vanished between the caller checking for it and this actually opening it)
 * rejects the returned promise instead of responding, so a caller can catch
 * it and fall back to another source. Once headers are already sent we're
 * committed to the response — a later error just ends the stream.
 *
 * @param res - HTTP response
 * @param file - file data
 * @param range - raw `Range` request header, if any
 * @throws if the file can't be read and no response has been sent yet
 */
export const stream_file = async (
  res: Response,
  file: StreamFile,
  range?: Maybe<string>,
) => {
  const mime_type = MIME_TYPES[file.type.toLowerCase()] ?? `audio/${file.type}`;

  res.set("content-type", mime_type);
  res.set("accept-ranges", "bytes");

  const requested_range = range ? parseRange(range, file.size) : null;

  // A range was asked for but cannot be satisfied
  if (range && !requested_range) {
    res.set("content-range", `bytes */${file.size}`);
    return res.sendStatus(416);
  }

  const { start, end } = requested_range ?? { start: 0, end: file.size - 1 };

  if (requested_range) {
    res.status(206);
    res.set("content-range", `bytes ${start}-${end}/${file.size}`);
  }

  res.set("content-length", (end - start + 1).toString());

  const stream = createReadStream(file.path, { start, end });

  await new Promise<void>((resolve, reject) => {
    stream.on("error", (error) => {
      if (res.headersSent) {
        res.end();
        resolve();
        return;
      }

      reject(error);
    });

    stream.on("close", resolve);
    stream.pipe(res);
  });
};
