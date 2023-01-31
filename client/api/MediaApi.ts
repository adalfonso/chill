import { MediaMatch } from "@common/media/types";
import { PaginationOptions } from "@common/types";
import { client } from "../client";

type Match = Record<MediaMatch & "year", string>;

export const MediaApi = {
  getGroupedByAlbum: (options?: PaginationOptions, artist?: string) =>
    client.media.query_as_group.query({
      options,
      group: ["album", "artist", "year"],
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

  query: (match: Partial<Match>) => client.media.query.query(match),

  search: (query: string) => client.media.search.query(query),

  scan: () => client.media.scan.mutate(),
};
