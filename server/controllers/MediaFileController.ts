import fs from "fs/promises";
import jwt from "jsonwebtoken";
import { AudioQuality as Quality } from "@common/types";
import { AudioType } from "@server/lib/media/types";
import { Media as MediaModel } from "@server/models/Media";
import { Media } from "@common/models/Media";
import { MediaCrawler } from "@server/lib/media/MediaCrawler";
import { Request as Req, Response as Res } from "express";
import { Request } from "@server/trpc";
import { TRPCError } from "@trpc/server";
import { adjustImage } from "@server/lib/media/image/ImageAdjust";
import { convert } from "@server/lib/conversion";
import { env } from "@server/init";
import { getAsGroup } from "@server/lib/data/utils";
import { sortResults } from "@server/lib/search/ResultSorter";
import { stream_file } from "@server/lib/stream";
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
  cast_info: z.object({
    media_ids: z.array(z.string()),
  }),

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
  castInfo: async ({
    ctx: { req },
    input: { media_ids },
  }: Request<typeof schema.cast_info>) => {
    if (req.user === undefined) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const documents = await MediaModel.find(
      { _id: { $in: media_ids } },
      { "cover.data": 0 },
    );

    const mapped = documents.reduce<Record<string, Media>>((carry, media) => {
      carry[media._id.toString()] = media;

      return carry;
    }, {});

    return media_ids
      .filter((id) => mapped[id] !== undefined)
      .map((id) => {
        const media = mapped[id];

        // TODO: What happens if the user queues a playlist with original flac
        // audio, then sets the audio quality to medium after?
        const file_type =
          req.user?.settings?.audio_quality === Quality.Original
            ? media.file_type
            : "mp3";

        const content_type = `audio/${file_type}`;
        const url = `${env.HOST}:${env.APP_PORT}/cast/media/${id}.${file_type}`;

        const token = jwt.sign(
          { for: req.user?.email, media_id: id },
          env.SIGNING_KEY,
          { expiresIn: "1h" },
        );

        return { url, token, content_type, meta: media };
      });
  },

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
      // Handles both /media/[123]/load and /media/[123.mp3]
      const [id, _ext] = req.params.id.split(".");
      const media = await MediaModel.findById<Media>(id);

      if (!media) {
        throw new Error("Failed to load media file data.");
      }

      if (req.user === undefined) {
        return res.sendStatus(401);
      }

      const quality_setting = req.user.settings?.audio_quality ?? null;
      const stats = await fs.stat(media.path);
      const mp3_quality_preference_kbps = quality_setting ?? Quality.Medium;
      const actual_quality_kbps = (stats.size * 8) / 1000 / media.duration;
      const do_convert =
        quality_setting !== Quality.Original &&
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

      const result = await getAsGroup(MediaModel, group, { match, pagination });

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
