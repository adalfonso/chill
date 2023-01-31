import fs from "fs/promises";
import { AudioQuality } from "../../common/types.js";
import { AudioType } from "../media/types.mjs";
import { Media as MediaModel } from "../models/Media.mjs";
import { Media } from "../../common/models/Media.js";
import { MediaCrawler } from "../media/MediaCrawler.mjs";
import { Request as Req, Response as Res } from "express";
import { Request } from "../trpc.mjs";
import { TRPCError } from "@trpc/server";
import { User } from "@common/models/User.js";
import { adjustImage } from "../media/image/ImageAdjust.mjs";
import { convert } from "../lib/conversion.mjs";
import { getAsGroup } from "../db/utils.mjs";
import { sortResults } from "../search/ResultSorter.mjs";
import { stream_file } from "../lib/stream.mjs";
import { z } from "zod";

const mongo_filter = z.object({
  $ne: z.null(),
});

// TODO: Is this match too permissible? It seems hard to keep track of
const media_match = z.object({
  artist: z.string().or(mongo_filter).optional(),
  album: z.string().nullable().or(mongo_filter).optional(),
  genre: z.string().or(mongo_filter).optional(),
  year: z.number().nullable().optional(),
});

export const schema = {
  search: z.string(),

  query: media_match,

  query_as_group: z.object({
    match: media_match,
    group: z.array(z.enum(["album", "artist", "genre", "year"])),
    sort: z.string().optional(),
    options: z
      .object({
        limit: z.number(),
        page: z.number(),
      })
      .optional(),
  }),
};

export const MediaFileController = {
  cover: async (req: Req, res: Res) => {
    const { filename } = req.params;
    const raw_size = req.query.size;

    if (typeof raw_size !== "string") {
      return res
        .status(400)
        .send(
          `Invalid size provided. Expected "string" but got ${typeof raw_size}.`,
        );
    }

    const size = parseInt(raw_size);

    if (Number.isNaN(size)) {
      return res
        .status(400)
        .send(`Invalid size provided. "${req.query.size}" must be an integer.`);
    }

    const result = await MediaModel.findById<Media>(
      filename.replace(/\.[^.]+$/, ""),
    );

    if (!result) {
      return res.sendStatus(404);
    }

    try {
      if (!result?.cover?.data) {
        throw new Error("Could not find album cover data.");
      }

      const img = await adjustImage(result.cover.data, { size, quality: 50 });

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

  /** Load a media file from is ID */
  load: async (req: Req, res: Res) => {
    try {
      const media = await MediaModel.findById<Media>(req.params.id);

      if (!media) {
        throw new Error("Failed to load media file data.");
      }
      const quality_setting =
        (req.user as User)?.settings?.audio_quality ?? null;
      const stats = await fs.stat(media.path);
      // TODO: Refactor this into own fn. parseInt for "original" audio quality will be NaN
      const mp3_quality_preference_kbps =
        quality_setting ?? AudioQuality.Medium;

      const actual_quality_kbps = (stats.size * 8) / 1000 / media.duration;
      const do_convert =
        quality_setting !== AudioQuality.Original &&
        parseInt(mp3_quality_preference_kbps) < actual_quality_kbps;

      if (do_convert) {
        try {
          const tmp_file = await convert(mp3_quality_preference_kbps, media);
          const stats = await fs.stat(tmp_file);

          await stream_file(res, {
            path: tmp_file,
            type: "mp3",
            size: stats.size.toString(),
          });
        } catch (e) {
          console.error(`Failed to convert audio file.`, {
            id: req.params.id,
            quality_preference_kbps: mp3_quality_preference_kbps,
          });
        }
      } else {
        await stream_file(res, {
          path: media.path,
          type: media.file_type,
          size: stats.size.toString(),
        });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send("Failed to load media file data.");
    }
  },

  /** Cause media file scanner to run */
  scan: async () => {
    const crawler = new MediaCrawler({
      workers: 100,
      chunk: 1000,
      file_types: Object.values(AudioType),
    });

    try {
      const scan = await crawler.crawl("/opt/app/media");

      return scan;
    } catch (_) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed when scanning media.",
      });
    }
  },

  search: async ({ input }: Request<typeof schema.search>) => {
    const query = input.toLowerCase();

    const results = await MediaModel.find<{ _doc: Media }>({
      $text: { $search: query },
    });

    return sortResults(results, query);
  },

  /** Get media files */
  query: async ({ input: match }: Request<typeof schema.query>) => {
    try {
      const result = await MediaModel.find(match);

      if (result.length === null) {
        throw new Error("Could not find media during query.");
      }

      return result;
    } catch (e) {
      console.error(e);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to query Media.",
      });
    }
  },

  queryAsGroup: async ({ input }: Request<typeof schema.query_as_group>) => {
    try {
      const { match, group, options: pagination } = input;

      // TODO: remove hack
      const result = await getAsGroup(MediaModel, group, {
        match,
        pagination,
      });

      return result;
    } catch (e) {
      console.error(e);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to query Media.",
      });
    }
  },
};
