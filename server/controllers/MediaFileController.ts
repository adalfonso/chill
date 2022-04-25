import * as fs from "fs/promises";
import { AudioType } from "@server/media/types";
import { Media as MediaGen } from "@common/autogen";
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

  /** Load a media file from is ID */
  load: async (req: Request<{ id: number }>, res: Response) => {
    try {
      const media = await Media.findById(req.params.id);

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
