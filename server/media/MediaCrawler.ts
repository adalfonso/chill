import * as fs from "fs/promises";
import * as mm from "music-metadata";
import * as path from "path";
import { Media, ScanModel as Scan } from "@common/autogen";
import { MediaModel } from "@server/models/Media";
import { Nullable } from "@server/types";
import { ScanModel } from "@server/models/Scan";

enum ScanStatus {
  Active = "ACTIVE",
  Failed = "FAILED",
  Completed = "COMPLETED",
}

/** Config options used by the crawler */
interface MediaCrawlerConfig {
  workers: number;
  chunk: number;
  file_types: string[];
}

type MediaFileTemplate = Omit<Media, "_id" | "created_at" | "updated_at">;

/** Traverse a directory and extract all media information */
export class MediaCrawler {
  /** Stores files paths to be processed */
  private _queue: string[] = [];

  /** Fully processed file data */
  private _processed: MediaFileTemplate[] = [];

  /** Number of available workers */
  private _available_workers;

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
  public async crawl(dir: string): Promise<Scan> {
    if (this._scan !== null) {
      return;
    }

    console.info("Crawling starting... 🐛");

    // TODO: remove this is temp
    await MediaModel.deleteMany();
    this._scan = await new ScanModel().save();
    this._available_workers = this._config.workers;

    return new Promise((resolve) => {
      resolve({ scan_id: this._scan._id });
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
      this._scan.status !== ScanStatus.Completed
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

      this._processed.push(meta);
    } catch (e) {
      // TODO: handle error
      console.error(e);
    }

    if (this._processed.length >= this._config.chunk) {
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
    this._available_workers = this._config.workers;
    this._queue = [];

    await this._write();
    this._scan.status = ScanStatus.Completed;
    this._scan.update_at = Date.now();
    this._scan.completed_at = this._scan.update_at;
    await this._scan.save();
    this._scan = null;

    console.info("Crawling completed... 🐛");
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
      const records = this._processed.splice(0, count);
      await MediaModel.insertMany(records);
      this._scan.records_written += records.length;
      this._scan.updated_at = Date.now();

      await this._scan.save();

      console.info(
        `Crawler stored ${this._scan.records_written} records... 🐛`,
      );
    } catch (e) {
      console.error(e);
    } finally {
      this._writing = false;
    }
  }
}
