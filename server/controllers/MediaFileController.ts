import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AudioType } from "@server/lib/media/types";
import { MediaCrawler } from "@server/lib/media/MediaCrawler";
import { Request } from "@server/trpc";
import { Search } from "@server/lib/data/Search";
import { SearchResult } from "@common/types";
import { db } from "@server/lib/data/db";

export const schema = {
  search: z.object({ query: z.string() }),
};

export const MediaFileController = {
  byFileType: async (): Promise<Record<string, number>> => {
    const fileTypeCounts = await db.track.groupBy({
      by: ["file_type"],
      _count: {
        file_type: true,
      },
    });

    return Object.fromEntries(
      fileTypeCounts.map((result) => [
        result.file_type,
        result._count.file_type,
      ]),
    );
  },
  /** Cause media file scanner to run */
  scan: async () => {
    const crawler = new MediaCrawler({
      workers: 100,
      chunk: 500,
      file_types: Object.values(AudioType),
    });

    try {
      const scan = await crawler.crawl("/opt/app/media");

      return scan;
    } catch (_) {
      console.error(_);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed when scanning media.",
      });
    }
  },

  search: async ({ input: { query } }: Request<typeof schema.search>) => {
    const TYPES = ["artist", "album", "track", "genre"];

    const queries = TYPES.flatMap((type) => [
      { index: "music" },
      {
        size: 5,
        query: {
          bool: {
            must: [{ term: { type } }],
            should: [
              { match_phrase: { value: { query, boost: 3 } } },
              { match: { value: { query, operator: "and" } } },
            ],
            minimum_should_match: 1,
          },
        },
      },
    ]);

    const response = await Search.instance().msearch<SearchResult>({
      body: queries,
    });

    return response.responses.flatMap((res) => {
      if (!("hits" in res)) return [];
      return res.hits.hits
        .map((hit) => hit._source)
        .filter((s): s is SearchResult => !!s);
    });
  },
};
