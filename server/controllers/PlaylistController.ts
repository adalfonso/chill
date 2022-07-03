import { ObjectId } from "mongodb";
import { PlaylistModel } from "@server/models/Playlist";
import { Request, Response } from "express";
import { toObjectId } from "@server/db/utils";
import { PaginationOptions } from "@common/types";
import { MediaModel } from "@server/models/Media";

namespace Req {
  export namespace track {
    export interface params {
      id: string;
    }
  }
  export namespace index {
    export type query = PaginationOptions;
  }

  export namespace create {
    export interface body {
      name: string;
      items: string[];
    }
  }

  export namespace update {
    export interface params {
      id: string;
    }
    export interface body {
      items: string[];
    }
  }
  export namespace query {
    export interface body {
      query: string;
    }
  }
}

type CreateRequest = Request<{}, {}, Req.create.body>;
type IndexRequest = Request<{}, {}, {}, Req.index.query>;
type QueryRequest = Request<{}, {}, Req.query.body>;
type TrackRequest = Request<Req.track.params>;
type UpdateRequest = Request<Req.update.params, {}, Req.update.body>;

export const PlaylistController = {
  index: async (req: IndexRequest, res: Response) => {
    const { limit = Infinity, page = 0 } = req.query ?? {};

    try {
      const results = await PlaylistModel.find()
        .sort({ created_at: "asc" })
        .skip(page > 0 ? (page + 1) * limit : 0)
        .limit(limit);

      res.json(results);
    } catch (e) {
      console.error("Failed to GET playlist/index: ", e);
      res.sendStatus(500);
    }
  },

  create: async (req: CreateRequest, res: Response) => {
    const { name, items = [] } = req.body;

    if (!name) {
      return res.status(422).send(`Missing required property "name"`);
    }

    try {
      const playlist = new PlaylistModel({
        _id: new ObjectId(),
        name,
        items: items.map(toObjectId),
      });

      await playlist.save();

      res.sendStatus(201);
    } catch (e) {
      console.error(e);

      if (e.message.match(/duplicate key/)) {
        return res.status(422).send("Playlist name is already taken");
      }

      res.sendStatus(500);
    }
  },

  update: async (req: UpdateRequest, res: Response) => {
    const { id } = req.params;
    const { items = [] } = req.body;

    try {
      const playlist = await PlaylistModel.findById(new ObjectId(id));

      if (!playlist) {
        return res.sendStatus(404);
      }

      playlist.items = [...playlist.items, ...items.map(toObjectId)];

      await playlist.save();

      res.sendStatus(204);
    } catch (e) {
      console.error(e);

      res.sendStatus(500);
    }
  },

  search: async (req: QueryRequest, res: Response) => {
    const query = req.body.query.toLowerCase();

    const results = await PlaylistModel.find({ $text: { $search: query } });

    res.json(results);
  },

  tracks: async (req: TrackRequest, res: Response) => {
    const { id } = req.params;

    try {
      const playlist = await PlaylistModel.findById(id);

      const results = await MediaModel.find({ _id: { $in: playlist.items } });

      res.json(results);
    } catch (e) {
      console.error("Failed to get Playlist tracks: ", e);
      res.sendStatus(500);
    }
  },
};
