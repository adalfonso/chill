import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AudioType } from "@server/lib/media/types";
import { MediaCrawler } from "@server/lib/media/MediaCrawler";
import { Request } from "@server/trpc";
import { Search } from "@server/lib/data/Search";
import { SearchResult } from "@common/types";

export const schema = {
  search: z.object({ query: z.string() }),
};

export const MediaFileController = {
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
    const response = await Search.instance().search<SearchResult>({
      index: "music",
      body: { query: { match: { value: query } } },
    });

    return response.hits.hits
      .map((hit) => hit._source)
      .filter((source): source is SearchResult => !!source);
  },
};
