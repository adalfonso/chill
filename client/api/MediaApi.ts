import { GroupedMedia, PaginationOptions } from "@common/types";
import { MediaMatch } from "@common/media/types";
import { client } from "../client";
import { query_options } from "@common/models/Media";
import { z } from "zod";

type Match = Record<MediaMatch & "year", string>;

export const MediaApi = {
  getGroupedByAlbum: (options?: PaginationOptions, artist?: string) =>
    client.media.query_as_group.query({
      options,
      group: ["album", "year"],
      // Get all albums for an artist or get all albums
      match: artist ? { artist } : { album: { $ne: null } },
    }),

  getGroupedByArtist: async (options?: PaginationOptions, genre?: string) =>
    client.media.query_as_group.query({
      options,
      group: ["artist"],
      // Get all artists for a genre or get all the artists
      match: genre ? { genre } : { artist: { $ne: null } },
    }),

  getGroupedByGenre: (options?: PaginationOptions) =>
    client.media.query_as_group.query({
      options,
      group: ["genre"],
      // Get all genres
      match: { genre: { $ne: null } },
    }),

  query: (match: Partial<Match>, options?: z.infer<typeof query_options>) =>
    client.media.query.query({ match, options }),

  search: (query: string) => client.media.search.query(query),

  scan: () => client.media.scan.mutate(),
};

export const ApiMap: Record<
  MediaMatch,
  (options?: PaginationOptions) => Promise<GroupedMedia[]>
> = {
  [MediaMatch.Artist]: MediaApi.getGroupedByArtist,
  [MediaMatch.Album]: MediaApi.getGroupedByAlbum,
  [MediaMatch.Genre]: MediaApi.getGroupedByGenre,
};
