import axios from "axios";
import { Media } from "@common/autogen";
import { MediaMatch as Match } from "@common/media/types";
import { PaginationOptions } from "@common/types";

export type MatchMap = Record<Match & "year", string | number>;

export const MediaApi = {
  search: (query: string) => axios.post(`/media/search`, { query }),
  query: (match: Partial<MatchMap>) => axios.post(`/media/query`, { match }),
  load: (file: Media) => axios.get(`/media/${file._id}/load`),

  getGroupedByArtist: (options?: PaginationOptions, genre?: string) => {
    const match = genre ? { genre } : { artist: { $ne: null } };
    return axios.post(`/media/query`, { options, group: ["artist"], match });
  },

  getGroupedByAlbum: (options?: PaginationOptions, artist?: string) => {
    const match = artist ? { artist } : { album: { $ne: null } };

    return axios.post(`/media/query`, {
      options: options ?? {},
      group: ["album", "artist", "year"],
      match,
    });
  },

  getGroupedByGenre: (options?: PaginationOptions) =>
    axios.post(`/media/query`, {
      options,
      group: ["genre"],
      match: { genre: { $ne: null } },
    }),
};
