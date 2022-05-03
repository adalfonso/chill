import * as fs from "fs/promises";
import * as mm from "music-metadata";
import * as path from "path";
import { Media, Scan } from "@common/autogen";
import { MediaModel } from "@server/models/Media";
import { Nullable } from "@server/types";
import { ScanModel } from "@server/models/Scan";

/** Config options used by the crawler */
interface MediaCrawlerConfig {
  workers: number;
  chunk: number;
  file_types: string[];
}

/** Output statistics from the crawler */
interface CrawlStats {
  start: Date;
  dirs: string[];
  files: MediaFileTemplate[];
  end: Date | null;
  errors: Error[];
}

type MediaFileTemplate = Omit<Media, "_id" | "created_at" | "updated_at">;

/** Traverse a directory and extract all media information */
export class MediaCrawler {
  /** If the crawler is currently running */
  private _busy = false;

  /** Stores files paths to be processed */
  private _queue: string[] = [];

  /** Number of available workers */
  private _available_workers;

  /** Stores statistics about a crawl */
  private _crawl_stats: CrawlStats;

  /** Holds the promise resolver for the public-facing crawl call */
  private _resolution: (value: CrawlStats) => void;

  /** Total # of records written to the DB */
  private _records_written = 0;

  /** If the DB is currently being written to */
  private _writing = false;

  /** Currently running scan document */
  private _scan: Nullable<Scan> = null;

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
  public async crawl(dir: string): Promise<CrawlStats> {
    if (this._busy) {
      return;
    }

    console.info("Crawling starting... 🐛");

    // TODO: remove this is temp
    await MediaModel.deleteMany();
    this._scan = await new ScanModel().save();
    this._busy = true;
    this._records_written = 0;
    this._available_workers = this._config.workers;
    this._crawl_stats = {
      start: new Date(),
      dirs: [],
      files: [],
      end: null,
      errors: [],
    };

    return new Promise((resolve) => {
      this._resolution = resolve;
      this._crawl(dir);
    });
  }

  /**
   * Local crawl strategy
   *
   * @param dir directory to crawl
   */
  private async _crawl(dir: string) {
    const contents = await fs.readdir(dir);
    const paths = contents.map((c) => path.join(dir, c));

    for (const p of paths) {
      this._queue.push(p);
    }

    this._crawl_stats.dirs.push(dir);
    this._available_workers++;
    this._process();
  }

  /**
   * Initiate processing event for the crawl
   *
   * This will get called periodically whenver it is time to further process the
   * crawl. This typically happens after a dir is read or metadata areprocessed.
   */
  private async _process() {
    const { workers } = this._config;

    // Process more queue items
    while (this._available_workers > 0 && this._queue.length) {
      this._available_workers--;
      const file_path = this._queue.shift();
      const stats = await fs.stat(file_path);

      if (stats.isDirectory()) {
        this._crawl(file_path);
      } else {
        this._processFile(file_path);
      }
    }

    // End the crawl
    if (
      this._queue.length === 0 &&
      this._available_workers === workers &&
      this._crawl_stats.end === null
    ) {
      this._complete();
    }
  }

  /**
   * Process a file's metadata
   *
   * @param file_path file path
   */
  private async _processFile(file_path: string) {
    const file_type = path.extname(file_path).replace(".", "").toLowerCase();

    // Not a valid file
    if (!this._config.file_types.includes(file_type)) {
      this._available_workers++;
      return this._process();
    }

    try {
      const { ctime } = await fs.stat(file_path);

      const meta = {
        ...(await this._getMetadata(file_path)),
        file_modified: ctime,
        file_type,
      };

      this._crawl_stats.files.push(meta);
    } catch (e) {
      this._crawl_stats.errors.push(e);
      console.error(e);
    }

    if (this._crawl_stats.files.length % this._config.chunk === 0) {
      await this._write(this._config.chunk);
    }

    this._available_workers++;
    this._process();
  }

  /**
   * Get meta data from a file path
   *
   * @param file_path file path
   * @returns meta data
   * @throws if it can't read meta data
   */
  private async _getMetadata(file_path: string) {
    const result = await mm.parseFile(file_path, { duration: true });
    const { common, format } = result;

    return {
      path: file_path,
      duration: format.duration ?? 0,
      artist: common.artist,
      title: common.title,
      track: common.track?.no ?? null,
      album: common.album,
      genre: common.genre?.[0] ?? null,
      year: common.year,
    };
  }

  /** Complete crawling */
  private async _complete() {
    this._crawl_stats.end = new Date();
    this._available_workers = this._config.workers;
    this._queue = [];
    this._busy = false;

    await this._write();
    await ScanModel.updateOne({
      _id: this._scan._id,
      status: "COMPLETED",
      completed_at: Date.now(),
    });
    console.info("Crawling completed... 🐛");

    this._resolution(this._crawl_stats);
  }

  /**
   * Trigger writing of a certain number of items to the DB
   *
   * @param count number of records to write
   */
  private async _write(count = Infinity) {
    if (this._writing) {
      return;
    }

    try {
      this._writing = true;
      const records = this._crawl_stats.files.splice(0, count);
      await MediaModel.insertMany(records);
      this._records_written += records.length;

      await ScanModel.updateOne({
        _id: this._scan._id,
        records_written: this._records_written,
      });

      console.info(`Crawler stored ${this._records_written} records... 🐛`);
    } catch (e) {
      console.error(e);
    } finally {
      this._writing = false;
    }
  }
}
