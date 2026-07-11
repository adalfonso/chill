import fs from "node:fs/promises";
import crypto from "node:crypto";
import { createReadStream, Stats } from "node:fs";
import * as mm from "music-metadata";
import { extname, join } from "node:path";
import { Scan, ScanStatus } from "@prisma/client";

import * as mappers from "./mappers";
import { Maybe } from "@common/types";
import { db } from "../data/db";
import { rebuildMusicSearchIndex } from "./MusicSearch";
import { cacheAlbumArt } from "./image/ImageCache";
import { deleteOrphans, deleteOrphanTracks } from "./deleteOrphans";

/** Config options used by the crawler */
type MediaCrawlerConfig = {
  workers: number;
  chunk: number;
  file_types: string[];
};

export type RawMediaPayload = {
  path: string;
  duration: number;
  artist: Maybe<string>;
  album_artist: Maybe<string>;
  album: Maybe<string>;
  title: Maybe<string>;
  track: Maybe<number>;
  disc_number: number;
  genre: Maybe<string>;
  year: Maybe<number>;
  cover?: Maybe<AlbumCover>;
  file_modified: Date;
  file_size: number;
  file_type: string;
  audio_checksum: string;
  bitrate: number;
  sample_rate: number;
  bits_per_sample: number;
};

export type AlbumCover = {
  format: string;
  data: Buffer;
  checksum: string;
  type: string;
};

/** Traverse a directory and extract all media information */
export class MediaCrawler {
  /** Stores files paths to be processed */
  private _queue: string[] = [];

  /** Fully processed file data */
  private _processed: Array<RawMediaPayload> = [];

  /** Paths of all valid media files seen during the scan */
  private _seen_paths: Set<string> = new Set();

  /** Number of files skipped because they were unchanged since the last scan */
  private _skipped = 0;

  /** Number of available workers */
  private _available_workers = 10;

  /** If the DB is currently being written to */
  private _write_lock: Maybe<Promise<void>> = null;

  /** Currently running scan document */
  private _scan: Maybe<Scan> = null;

  /** Time/data the scan started */
  private _start_time: Maybe<Date> = null;

  /**
   * @param _config crawler config
   */
  constructor(private _config: MediaCrawlerConfig) {}

  /**
   * Crawl a directory, get file meta data, and store in the DB
   *
   * @param dir directory to start from
   * @returns crawler results
   */
  public async crawl(dir: string): Promise<Scan> {
    if (this._scan !== null) {
      return this._scan;
    }

    console.info("Crawling starting... 🐛");

    this._start_time = new Date();
    this._seen_paths = new Set();
    this._skipped = 0;

    this._scan = await db.scan.create({ data: {} });
    this._available_workers = this._config.workers;
    this._crawl(dir);
    return this._scan;
  }

  /**
   * Local crawl strategy
   *
   * @param dir directory to crawl
   */
  private async _crawl(dir: string) {
    const contents = await fs.readdir(dir);

    const paths = contents.map((c) => join(dir, c));

    for (const p of paths) {
      this._queue.push(p);
    }

    this._available_workers = Math.min(
      this._available_workers + 1,
      this._config.workers,
    );
    this._tick();
  }

  /**
   * Initiate processing event for the crawl
   *
   * This will get called periodically whenver it is time to further process the
   * crawl. This typically happens after a dir is read or metadata areprocessed.
   */
  private async _tick() {
    if (this._scan?.status !== ScanStatus.Active) {
      return;
    }

    const { workers } = this._config;

    // Process more queue items
    while (
      this._available_workers > 0 &&
      this._queue.length &&
      this._scan?.status === ScanStatus.Active
    ) {
      this._available_workers--;

      // Will always be string due to while condition above
      const file_path = this._queue.shift() as string;
      const stats = await fs.stat(file_path);

      if (stats.isDirectory()) {
        this._crawl(file_path);
      } else {
        this._processFile(file_path, stats);
      }
    }

    // End the crawl
    if (this._queue.length === 0 && this._available_workers === workers) {
      this._complete();
    }
  }

  /**
   * Process a file's metadata
   *
   * @param file_path file path
   * @param stats file stats from the queue traversal
   */
  private async _processFile(file_path: string, stats: Stats) {
    const file_type = extname(file_path).replace(".", "").toLowerCase();

    // Not a valid file
    if (!this._config.file_types.includes(file_type)) {
      this._available_workers++;
      return this._tick();
    }

    this._seen_paths.add(file_path);

    try {
      if (await this._hasChanged(file_path, stats)) {
        this._processed.push(await this._getMetadata(file_path, stats));
      } else {
        this._skipped++;
      }
    } catch (e) {
      console.error(e);
      // don't relinquish the worker
      this._complete(ScanStatus.Failed);
    }

    if (this._processed.length >= this._config.chunk) {
      await this._write(this._config.chunk);
    }

    this._available_workers++;
    this._tick();
  }

  /**
   * Determine if a file is new or has changed since the last scan
   *
   * Compares (file_modified, file_size) against the stored track. A track
   * without an audio_checksum is treated as changed so its checksum gets
   * backfilled.
   *
   * @param file_path file path
   * @param stats file stats
   * @returns whether the file needs (re)processing
   */
  private async _hasChanged(file_path: string, stats: Stats) {
    const existing = await db.track.findUnique({
      where: { path: file_path },
      select: { file_modified: true, file_size: true, audio_checksum: true },
    });

    if (existing === null || existing.audio_checksum === null) {
      return true;
    }

    return (
      existing.file_modified.getTime() !== stats.ctime.getTime() ||
      existing.file_size !== stats.size
    );
  }

  /**
   * Get meta data from a file path
   *
   * @param file_path file path
   * @param stat file stats
   * @returns meta data
   */
  private async _getMetadata(
    file_path: string,
    stat: Stats,
  ): Promise<RawMediaPayload> {
    const result = await mm.parseFile(file_path, { duration: true });
    const { common, format } = result;

    const cover = await getCoverData(common.picture);

    return {
      path: file_path,
      file_type: extname(file_path).replace(".", "").toLowerCase(),
      duration: format.duration ?? 0,
      artist: common.artist ?? null,
      album_artist: common.albumartist ?? common.artist ?? null,
      title: common.title ?? null,
      track: common.track?.no ?? null,
      disc_number: common.disk?.no ?? 1,
      album: common.album ?? null,
      genre: common.genre?.[0] ?? null,
      year: common.year ?? null,
      bitrate: Math.floor(format.bitrate ?? 0 / 1000) || 0,
      sample_rate: Math.floor(format.sampleRate ?? 0 / 1000) || 0,
      bits_per_sample: getBitsPerSample(stat, format),
      cover: cover
        ? {
            format: cover.format,
            type: cover.type ?? "",
            data: cover.data,
            checksum: cover.checksum,
          }
        : null,
      file_modified: stat.ctime,
      file_size: stat.size,
      audio_checksum: await computeFileChecksum(file_path, stat),
    };
  }

  /**
   * Trigger writing of a certain number of items to the DB
   *
   * Writes are chained on the previous write's promise so concurrent
   * callers are fully serialized — merely awaiting the lock would release
   * every stacked caller at once when it resolves, running their writes
   * concurrently.
   *
   * @param count number of records to write
   */
  private _write(count = Infinity) {
    const previous = this._write_lock ?? Promise.resolve();

    this._write_lock = previous
      .then(async () => {
        if (this._scan?.status !== ScanStatus.Active) {
          return;
        }

        const records = this._processed.splice(0, count);

        if (records.length === 0) {
          return;
        }

        const [genre_map, artist_map] = await Promise.all([
          mappers.upsertGenres(records),
          mappers.upsertArtists(records),
        ]);

        const album_map = await mappers.upsertAlbums(records, artist_map);

        await mappers.upsertTracks(records, {
          genre: genre_map,
          album: album_map,
          artist: artist_map,
        });

        this._scan.records_written += records.length;
        this._scan.updated_at = new Date();

        await this._saveScan(this._scan);

        console.info(
          `Crawler stored ${this._scan.records_written} records... 🐛`,
        );
      })
      // Log and swallow so a failed batch doesn't poison the chain for
      // every subsequent write
      .catch((e) => console.error(e));

    return this._write_lock;
  }

  /** Complete crawling */
  private async _complete(status: ScanStatus = ScanStatus.Completed) {
    this._available_workers = this._config.workers;
    this._queue = [];

    await this._write();

    // Only prune on a fully completed scan — a partial traversal would
    // misidentify unseen tracks as orphans
    if (status === ScanStatus.Completed) {
      await deleteOrphanTracks(this._seen_paths);
      await deleteOrphans();
    }

    if (this._scan === null) {
      throw new Error("Tried to complete scan but it was null");
    }

    this._scan.status = status;
    this._scan.updated_at = new Date();

    if (status === ScanStatus.Completed) {
      this._scan.completed_at = this._scan.updated_at;
    }

    await this._saveScan(this._scan);

    this._scan = null;

    const start = this._start_time ?? new Date();

    console.info(`Crawling ${status.toLowerCase()}... 🐛`);
    console.info(`Skipped ${this._skipped} unchanged files`);
    console.info(
      `Took ${(new Date().valueOf() - start?.valueOf()) / 1000} seconds`,
    );

    await rebuildMusicSearchIndex();
    await cacheAlbumArt();
  }

  /**
   * Update scan document after a change has been made
   *
   * @param scan - current scan object
   */
  private async _saveScan(scan: Scan) {
    this._scan = await db.scan.update({
      where: { id: scan.id },
      data: { ...scan },
    });
  }
}

const getBitsPerSample = (stats: Stats, format: mm.IFormat) => {
  if (format.bitsPerSample) {
    return format.bitsPerSample;
  }

  if (format.numberOfSamples) {
    return (
      (8 * stats.size) /
      (format.numberOfSamples * (format.numberOfChannels ?? 2))
    );
  }

  return 0;
};

/**
 * Compute a SHA-256 checksum of a buffer
 */
const computeCoverDataChecksum = (buffer: Buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

/**
 * Number of bytes hashed from each end of a file for its fingerprint —
 * sized so per-file read latency, not transfer, dominates on NAS storage.
 * Smaller windows stop helping; larger ones just read more bytes.
 */
const FINGERPRINT_CHUNK_SIZE = 256 * 1024;

/**
 * Compute a SHA-256 fingerprint of a file
 *
 * Hashes the file size plus the first and last 256KB of content rather than
 * the whole file — tag edits and truncation land in the head/tail or change
 * the size, and reading half a megabyte instead of the full file keeps
 * backfill scans from being bottlenecked on NAS throughput. Files small
 * enough for the head and tail to overlap are hashed in full.
 *
 * @param file_path file path
 * @param stats file stats
 * @returns hex-encoded fingerprint
 */
const computeFileChecksum = async (file_path: string, stats: Stats) => {
  const hash = crypto.createHash("sha256");

  hash.update(String(stats.size));

  const ranges =
    stats.size <= 2 * FINGERPRINT_CHUNK_SIZE
      ? [{}]
      : [
          { start: 0, end: FINGERPRINT_CHUNK_SIZE - 1 },
          { start: stats.size - FINGERPRINT_CHUNK_SIZE },
        ];

  for (const range of ranges) {
    for await (const chunk of createReadStream(file_path, range)) {
      hash.update(chunk as Buffer);
    }
  }

  return hash.digest("hex");
};

/**
 * Extracts, normalizes, and encodes cover art data from a parsed audio file.
 *
 * This function selects the most appropriate cover image from the provided
 * metadata pictures, computes its checksum for deduplication or change tracking,
 * and resizes the image to a standard size before returning it as a Base64 string.
 *
 * @param file_path - The absolute or relative path of the source audio file (used for logging).
 * @param input - An array of `music-metadata` picture objects (e.g., from `common.picture`), or `undefined` if none exist.
 * @returns cover data or null
 */
const getCoverData = async (
  input: Array<mm.IPicture> | undefined,
): Promise<
  Maybe<{
    data: Buffer;
    checksum: string;
    format: string;
    type: string | undefined;
  }>
> => {
  if (!input) {
    return null;
  }

  const cover = mm.selectCover(input);

  if (!cover) {
    return null;
  }

  const buffer = Buffer.from(cover.data);

  return {
    data: buffer,
    checksum: computeCoverDataChecksum(buffer),
    format: cover.format,
    type: cover.type,
  };
};
