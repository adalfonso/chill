import * as fs from "fs/promises";
import sharp from "sharp";
import { AudioType } from "@server/media/types";
import { Media } from "@common/autogen";
import { MediaCrawler } from "@server/media/MediaCrawler";
import { MediaModel } from "@server/models/Media";
import { Request, Response } from "express";
import { getAsGroup } from "@server/db/utils";
import { sortResults } from "@server/search/ResultSorter";

interface MediaFileGetArgs {
  match: Record<keyof Media, string>;
  group: string[];
  sort: "asc" | "desc";
}

export const MediaFileController = {
  /** Get media files */
  query: async (req: Request<Partial<MediaFileGetArgs>>, res: Response) => {
    try {
      // TODO: utilize sort
      const { match, group, sort, options: pagination } = req.body;

      if (group) {
        res.json(
          await getAsGroup(MediaModel, group, {
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
  load: async (req: Request<{ id: number }>, res: Response) => {
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

  cover: async (req: Request, res: Response) => {
    const { filename } = req.params;
    const { size } = req.query;

    if (size !== undefined && Number.isNaN(parseInt(size))) {
      return res
        .status(422)
        .send(`Invalid size provided. "${size}" must be an integer`);
    }

    const result = await MediaModel.findById(filename.replace(/\.[^.]+$/, ""));

    if (!result) {
      return res.sendStatus(404);
    }

    try {
      const buffer = Buffer.from(result.cover.data, "base64");
      const img =
        size === undefined
          ? buffer
          : await sharp(buffer)
              .resize(parseInt(size))
              .jpeg({ quality: 50 })
              .toBuffer();

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

    const results = await MediaModel.find({ $text: { $search: query } });

    res.json(sortResults(results, query));
  },
};
