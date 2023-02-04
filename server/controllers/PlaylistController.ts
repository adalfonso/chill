import { Media } from "../models/Media";
import { Playlist } from "../models/Playlist";
import { Request } from "../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const schema = {
  create: z.object({
    name: z.string(),
    items: z.array(z.string()).optional(),
  }),

  get: z.string(),

  index: z.object({
    limit: z.number(),
    page: z.number(),
  }),

  search: z.string(),

  tracks: z.string(),

  update: z.object({
    id: z.string(),
    items: z.array(z.string()),
  }),
};

export const PlaylistController = {
  create: async ({
    input: { name, items = [] },
  }: Request<typeof schema.create>) => {
    try {
      const playlist = new Playlist({ name, items });

      await playlist.save();
    } catch (e) {
      console.error(e);

      if ((e as Error).message.match(/duplicate key/)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Playlist name is already taken.",
        });
      }

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },

  get: async ({ input: id }: Request<typeof schema.get>) => {
    try {
      const playlist = await Playlist.findById(id);

      if (playlist === null) {
        throw new Error("Can't find playlist");
      }

      return playlist;
    } catch (e) {
      console.error("Failed to get Playlist: ", e);

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },

  index: async ({
    input: { limit = Infinity, page = 0 },
  }: Request<typeof schema.index>) => {
    try {
      const results = await Playlist.find()
        .sort({ created_at: "asc" })
        .skip(page > 0 ? (page + 1) * limit : 0)
        .limit(limit);

      if (results === null) {
        throw new Error("Can't find playlists");
      }

      return results;
    } catch (e) {
      console.error("Failed to GET playlist/index: ", e);

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },

  search: async ({ input: query }: Request<typeof schema.search>) => {
    // TODO: Add error handling
    const results = await Playlist.find({
      $text: { $search: query.toLowerCase() },
    });

    return results;
  },

  tracks: async ({ input: id }: Request<typeof schema.tracks>) => {
    try {
      const playlist = await Playlist.findById(id);

      if (playlist === null) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const results = await Media.find({ _id: { $in: playlist.items } });

      return results;
    } catch (e) {
      console.error("Failed to get Playlist tracks: ", e);

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },

  update: async ({
    input: { id, items = [] },
  }: Request<typeof schema.update>) => {
    try {
      const playlist = await Playlist.findById(id);

      if (!playlist) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // TODO: Fix hack
      (playlist as any).items = [...playlist.items, ...items];

      await playlist.save();
    } catch (e) {
      console.error(e);

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },
};
