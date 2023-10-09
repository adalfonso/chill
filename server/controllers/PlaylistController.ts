import { Media as MediaModel } from "@server/models/Media";
import { Playlist as PlaylistModel } from "@server/models/Playlist";
import { Request } from "@server/trpc";
import { TRPCError } from "@trpc/server";
import { base_projection } from "@common/models/Media";
import { pagination_options } from "@common/schema";
import { z } from "zod";

export const schema = {
  create: z.object({
    name: z.string(),
    items: z.array(z.string()).optional(),
  }),

  get: z.string(),

  index: pagination_options,

  search: z.string(),

  tracks: z.object({
    id: z.string(),
    options: pagination_options,
  }),

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
      const playlist = new PlaylistModel({ name, items });

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
      const playlist = await PlaylistModel.findById(id);

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
      const results = await PlaylistModel.find()
        .sort({ created_at: "asc" })
        .skip(page > 0 ? page * limit : 0)
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
    const results = await PlaylistModel.find({
      $text: { $search: query.toLowerCase() },
    });

    return results;
  },

  tracks: async ({
    input: {
      id,
      options: { limit = Infinity, page = 0 },
    },
  }: Request<typeof schema.tracks>) => {
    try {
      const playlist = await PlaylistModel.findById(id);

      if (playlist === null) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Used to preserve playlist track order after query
      const lookup = playlist.items.reduce<Record<string, number>>(
        (carry, track, index) => {
          carry[track] = index;
          return carry;
        },
        {},
      );

      const items = playlist.items.slice(
        page ? page * limit : 0,
        (page + 1) * limit,
      );

      if (items.length === 0) {
        return [];
      }

      const results = await MediaModel.find({
        _id: { $in: items },
      }).select(base_projection);

      return results.sort(
        (a, b) => lookup[a._id.toString()] - lookup[b._id.toString()],
      );
    } catch (e) {
      console.error("Failed to get Playlist tracks: ", e);

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },

  update: async ({
    input: { id, items = [] },
  }: Request<typeof schema.update>) => {
    try {
      const playlist = await PlaylistModel.findById(id);

      if (!playlist) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      playlist.items = [...playlist.items, ...items];

      await playlist.save();
    } catch (e) {
      console.error(e);

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },
};
