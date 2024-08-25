import fs from "node:fs/promises";
import mm from "music-metadata";
import { extname, join } from "node:path";
import { Scan, ScanStatus } from "@prisma/client";

import * as mappers from "./mappers";
import { Maybe } from "@common/types";
import { adjustImage } from "./image/ImageAdjust";
import { db } from "../data/db";
import { rebuildMusicSearchIndex } from "./MusicSearch";
import { cacheAlbumArt } from "./image/ImageCache";

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
  album: Maybe<string>;
  title: Maybe<string>;
  track: Maybe<number>;
  genre: Maybe<string>;
  year: Maybe<number>;
  cover?: Maybe<AlbumCover>;
  file_modified: Date;
  file_type: string;
};

export type AlbumCover = {
  format: string;
  data: string;
  type: string;
};

/** Traverse a directory and extract all media information */
export class MediaCrawler {
  /** Stores files paths to be processed */
  private _queue: string[] = [];

  /** Fully processed file data */
  private _processed: Array<RawMediaPayload> = [];

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

    await db.playlistTrack.deleteMany();
    await db.playlist.deleteMany();
    await db.track.deleteMany();

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

    this._available_workers++;
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
        this._processFile(file_path);
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
   */
  private async _processFile(file_path: string) {
    const file_type = extname(file_path).replace(".", "").toLowerCase();

    // Not a valid file
    if (!this._config.file_types.includes(file_type)) {
      this._available_workers++;
      return this._tick();
    }

    try {
      this._processed.push(await this._getMetadata(file_path));
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
   * Get meta data from a file path
   *
   * @param file_path file path
   * @returns meta data
   */
  private async _getMetadata(file_path: string): Promise<RawMediaPayload> {
    const result = await mm.parseFile(file_path, { duration: true });
    const { common, format } = result;
    const cover = mm.selectCover(common.picture);

    let cover_data = cover ? cover.data.toString("base64") : null;

    if (cover_data !== null) {
      try {
        cover_data = (
          await adjustImage(cover_data, { size: 512, quality: 100 })
        ).toString("base64");
      } catch (e) {
        console.error(`Failed to convert cover data for ${file_path}: ${e}`);
      }
    }

    return {
      path: file_path,
      file_type: extname(file_path).replace(".", "").toLowerCase(),
      duration: format.duration ?? 0,
      artist: common.artist ?? null,
      title: common.title ?? null,
      track: common.track?.no ?? null,
      album: common.album ?? null,
      genre: common.genre?.[0] ?? null,
      year: common.year ?? null,
      cover:
        cover && cover_data
          ? {
              format: cover.format,
              type: cover.type ?? "",
              data: cover_data,
            }
          : null,

      file_modified: (await fs.stat(file_path)).ctime,
    };
  }

  /**
   * Trigger writing of a certain number of items to the DB
   *
   * @param count number of records to write
   */
  private async _write(count = Infinity) {
    if (this._write_lock) {
      await this._write_lock;
    }

    this._write_lock = new Promise(async (resolve, reject) => {
      if (this._scan?.status !== ScanStatus.Active) {
        return resolve();
      }

      try {
        const records = this._processed.splice(0, count);

        const [genre_map, artist_map] = await Promise.all([
          mappers.upsertGenres(records),
          mappers.upsertArtists(records),
        ]);

        const album_map = await mappers.upsertAlbums(records, artist_map);

        await mappers.insertTracks(records, {
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
        resolve();
      } catch (e) {
        console.error(e);
        reject(e);
      } finally {
        this._write_lock = null;
      }
    });

    return this._write_lock;
  }

  /** Complete crawling */
  private async _complete(status: ScanStatus = ScanStatus.Completed) {
    this._available_workers = this._config.workers;
    this._queue = [];

    await this._write();

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
