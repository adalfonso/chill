import * as fs from "fs/promises";
import * as mm from "music-metadata";
import * as path from "path";
import { Nullable } from "@server/types";

interface MediaCrawlerConfig {
  workers: number;
  file_types: string[];
}

interface MediaFile {
  path: string;
  artist: Nullable<string>;
  title: Nullable<string>;
  track: Nullable<number>;
  genre: Nullable<string>;
  year: Nullable<number>;
  modified: Date;
  file_type: string;
}

interface CrawlStats {
  start: Date;
  dirs: string[];
  files: MediaFile[];
  end: Date | null;
}

/** Traverse a directory and extract all media information */
export class MediaCrawler {
  /** If the crawler is currently running */
  private _busy = false;

  /** Stores processed meta data */
  private _store: unknown[] = [];

  /** Stores files paths to be processed */
  private _queue: string[] = [];

  /** Number of available threads */
  private _available_threads;

  /** Stores statistics about a crawl */
  private _crawl_stats: CrawlStats;

  /** Holder the promise resolver for the public-facing crawl call */
  private _resolution: (value: CrawlStats) => void;

  constructor(private _config: MediaCrawlerConfig) {}

  /**
   * Crawl a directory and get file meta data
   *
   * @param dir directory to start from
   * @returns crawler results
   */
  public async crawl(dir: string): Promise<CrawlStats> {
    if (this._busy) {
      return;
    }

    this._busy = true;
    this._available_threads = this._config.workers;

    this._crawl_stats = {
      start: new Date(),
      dirs: [],
      files: [],
      end: null,
    };

    return new Promise((resolve, reject) => {
      this._resolution = resolve;
      this._crawl(dir);
    });
  }

  /**
   * Local crawl atrategy
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
    this._available_threads++;
    this._process();
  }

  /**
   * Initiate processing event for the crawl
   *
   * This will get called periodically whenver it is time to further process the
   * crawl. This typically happens after a dir is read or metadata are
   * processed.
   */
  private async _process() {
    const { workers } = this._config;

    // Process more queue items
    while (this._available_threads > 0 && this._queue.length) {
      this._available_threads--;
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
      this._available_threads === workers &&
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
      this._available_threads++;
      return this._process();
    }

    try {
      const { ctime } = await fs.stat(file_path);

      const meta = {
        ...(await this._getMetadata(file_path)),
        modified: ctime,
        file_type,
      };

      this._crawl_stats.files.push(meta);
    } catch (e) {
      console.error(e);
    }

    this._available_threads++;
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
    const result = await mm.parseFile(file_path);

    return {
      path: file_path,
      artist: result.common.artist,
      title: result.common.title,
      track: result.common.track.no,
      genre: result.common.genre[0] ?? null,
      year: result.common.year,
    };
  }

  /** Complete crawling */
  private _complete() {
    this._crawl_stats.end = new Date();
    this._available_threads = this._config.workers;
    this._queue = [];
    this._busy = false;

    this._resolution(this._crawl_stats);
  }
}
