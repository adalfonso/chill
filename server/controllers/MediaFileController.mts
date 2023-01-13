import fs from "fs/promises";
import { AudioType } from "../media/types.mjs";
import { Media, MediaDocument } from "../../common/autogen.js";
import { MediaCrawler } from "../media/MediaCrawler.mjs";
import { MediaModel } from "../models/Media.mjs";
import { Request, Response } from "express";
import { adjustImage } from "../media/image/ImageAdjust.mjs";
import { convert } from "../lib/conversion.mjs";
import { getAsGroup } from "../db/utils.mjs";
import { sortResults } from "../search/ResultSorter.mjs";
import { stream_file } from "../lib/stream.mjs";

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
      const media = await MediaModel.findById<MediaDocument>(req.params.id);

      if (!media) {
        throw new Error("Failed to load media file data");
      }
      const stats = await fs.stat(media.path);
      const mp3_quality_preference_kbps = 120;
      const quality_kbps = (stats.size / media.duration) * 8;
      const do_convert = mp3_quality_preference_kbps < quality_kbps;

      if (do_convert) {
        try {
          const tmp_file = await convert(mp3_quality_preference_kbps, media);
          const stats = await fs.stat(tmp_file);

          await stream_file(res, {
            path: tmp_file,
            type: "mp3",
            size: stats.size.toString(),
          });
        } catch (e) {
          console.error(`Failed to convert audio file`, {
            id: req.params.id,
            quality_preference_kbps: mp3_quality_preference_kbps,
          });
        }
      } else {
        await stream_file(res, {
          path: media.path,
          type: media.file_type,
          size: stats.size.toString(),
        });
      }
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
