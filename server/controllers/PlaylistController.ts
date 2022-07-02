import { ObjectId } from "mongodb";
import { PlaylistModel } from "@server/models/Playlist";
import { Request, Response } from "express";
import { toObjectId } from "@server/db/utils";

namespace Req {
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
type UpdateRequest = Request<Req.update.params, {}, Req.update.body>;
type QueryRequest = Request<{}, {}, Req.query.body>;

export const PlaylistController = {
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
};
