import { PlaylistModel } from "@server/models/Playlist";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";

namespace Req {
  export namespace create {
    export interface body {
      name: string;
      items: string[];
    }
  }
}

type CreateRequest = Request<{}, {}, Req.create.body>;

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
        items: items.map((id) => new ObjectId(id)),
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
};
