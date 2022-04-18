import { AudioType } from "@server/media/types";
import { MediaCrawler } from "@server/media/MediaCrawler";
import { MediaFile } from "@server/models/MediaFile";
import { Request, Response } from "express";
import { MediaTypeFilter } from "@common/MediaType/types";

export const MediaFileController = {
  /** Get media files */
  get: async (req: Request, res: Response) => {
    try {
      const filter = req.query.filter ?? "artist";
      const results = await MediaFile.aggregate([
        {
          $group: {
            // TODO: add validation
            _id: getGroupingByFilter(filter as MediaTypeFilter),
            count: { $sum: 1 },
          },
        },
      ]).sort({ _id: "asc" });

      res.json(results);
    } catch (e) {
      res.status(500);
    }
  },

  /** Cause media file scanner to run */
  scan: async (req: Request, res: Response) => {
    const crawler = new MediaCrawler({
      workers: 50,
      file_types: Object.values(AudioType),
    });

    try {
      res.json(await crawler.crawl("/opt/app/media"));
    } catch (_) {
      res.status(500);
    }
  },
};

/**
 * Get the fields used to group media by a certain filter
 *
 * @param filter filter name
 * @returns grouping
 */
const getGroupingByFilter = (filter: MediaTypeFilter) =>
  ({
    ["artist"]: ["$artist"],
    ["album"]: ["$album", "$artist", "$year"],
    ["genre"]: ["$genre"],
  }[filter]);
