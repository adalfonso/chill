import { MediaFile } from "@server/models/MediaFile";
import { Request, Response } from "express";
import { getAsGroup } from "@server/db/utils";

export const AlbumController = {
  /** Get Album media files */
  index: async (req: Request, res: Response) => {
    try {
      const match = ["artist"]
        .filter((f) => req.query[f] !== undefined)
        .map((f) => ({ [f]: { $eq: req.query[f] } }))
        .reduce((carry, filter) => ({ ...carry, ...filter }), {});

      const grouping = ["album", "artist", "year"];
      const options = { match };
      const results = await getAsGroup(MediaFile, grouping, options);

      res.json(results);
    } catch (e) {
      res.status(500);
    }
  },
};
