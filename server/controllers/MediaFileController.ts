import { AudioType } from "@server/media/types";
import { Media as MediaGen } from "@server/models/autogen";
import { Media } from "@server/models/Media";
import { MediaCrawler } from "@server/media/MediaCrawler";
import { Request, Response } from "express";
import { getAsGroup } from "@server/db/utils";

interface MediaFileGetArgs {
  match: Record<keyof MediaGen, string>;
  group: string[];
  sort: "asc" | "desc";
}

export const MediaFileController = {
  /** Get media files */
  query: async (req: Request<Partial<MediaFileGetArgs>>, res: Response) => {
    try {
      // TODO: utilize sort
      const { match, group, sort } = req.body;

      if (group) {
        // Ignore null record to the leading group
        const non_null_match = { [group[0]]: { $ne: null } };
        const options = { match: { ...match, ...non_null_match } };

        res.json(await getAsGroup(Media, group, options));
      } else {
        res.json(await Media.find(match));
      }
    } catch (e) {
      res.status(500).send("Failed to query Media");
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
      res.status(500).send("Failed when scanning media");
    }
  },
};
