import fs from "fs/promises";
import { AudioType } from "../media/types.mjs";
import { Media, MediaDocument } from "../../common/autogen.js";
import { MediaCrawler } from "../media/MediaCrawler.mjs";
import { MediaModel } from "../models/Media.mjs";
import { Request, Response } from "express";
import { adjustImage } from "../media/image/ImageAdjust.mjs";
import { getAsGroup } from "../db/utils.mjs";
import { sortResults } from "../search/ResultSorter.mjs";

namespace Req {
  export namespace query {
    export interface params {
      match: Record<keyof Media, string>;
      group: string[];
      sort: "asc" | "desc";
    }
  }

  export namespace load {
    export interface params {
      id: number;
    }
  }

  export namespace cover {
    export interface params {
      filename: string;
    }

    export interface query {
      size: string;
    }
  }
}

type CoverReq = Request<Req.cover.params, unknown, unknown, Req.cover.query>;
type LoadReq = Request<Req.load.params>;
type QueryReq = Request<Partial<Req.query.params>>;

export const MediaFileController = {
  /** Get media files */
  query: async (req: QueryReq, res: Response) => {
    try {
      // TODO: utilize sort
      const { match, group, sort, options: pagination } = req.body;

      if (group) {
        res.json(
          // TODO: remove hack
          await getAsGroup<any, any>(MediaModel, group, {
            match,
            pagination,
          }),
        );
      } else {
        res.json(await MediaModel.find(match));
      }
    } catch (e) {
      console.error(e);
      res.status(500).send("Failed to query Media");
    }
  },

  /** Load a media file from is ID */
  load: async (req: LoadReq, res: Response) => {
    try {
      const media = await MediaModel.findById(req.params.id);

      if (!media) {
        throw new Error("Failed to load media file data");
      }

      const stats = await fs.stat(media.path);

      res.set("content-type", `audio/${media.file_type}`);
      res.set("accept-ranges", "bytes");
      res.set("content-length", stats.size.toString());

      const handle = await fs.open(media.path, "r");
      const stream = handle.createReadStream();

      stream.on("data", (chunk) => res.write(chunk));
      stream.on("error", () => res.sendStatus(500));
      stream.on("end", () => res.end());
    } catch (e) {
      console.error(e);
      res.status(500).send("Failed to load media file data");
    }
  },

  cover: async (req: CoverReq, res: Response) => {
    const { filename } = req.params;
    const size = parseInt(req.query.size);

    if (Number.isNaN(size)) {
      return res
        .status(422)
        .send(`Invalid size provided. "${req.query.size}" must be an integer`);
    }

    const result = await MediaModel.findById<MediaDocument>(
      filename.replace(/\.[^.]+$/, ""),
    );

    if (!result) {
      return res.sendStatus(404);
    }

    try {
      const img = await adjustImage(result.cover.data, { size, quality: 50 });

      res.writeHead(200, {
        "Content-Type": result.cover.format,
        "Content-Length": img.length,
      });

      res.end(img);
    } catch (e) {
      console.error(e);

      return res.status(500).send(`Failed to load image.`);
    }
  },

  /** Cause media file scanner to run */
  scan: async (req: Request, res: Response) => {
    const crawler = new MediaCrawler({
      workers: 100,
      chunk: 1000,
      file_types: Object.values(AudioType),
    });

    try {
      res.json(await crawler.crawl("/opt/app/media"));
    } catch (_) {
      res.status(500).send("Failed when scanning media");
    }
  },

  search: async (req: Request, res: Response) => {
    const query = req.body.query.toLowerCase();

    const results = await MediaModel.find<{ _doc: MediaDocument }>({
      $text: { $search: query },
    });

    res.json(sortResults(results, query));
  },
};
