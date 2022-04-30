import axios from "axios";
import { MediaMatch as Match } from "@common/MediaType/types";
import { Media } from "@common/autogen";

export type MatchMap = Record<Match, string | number>;

export const MediaApi = {
  search: (query: string) => axios.post(`/media/search`, { query }),
  query: (match: Partial<MatchMap>) => axios.post(`/media/query`, { match }),

  load: (file: Media) => axios.get(`/media/${file._id}/load`),

  getGroupedByArtist: (genre?: string) => {
    const match = genre ? { match: { genre } } : {};
    const options = { group: ["artist"], ...match };
    return axios.post(`/media/query`, options);
  },

  getGroupedByAlbum: (artist?: string) => {
    const match = artist ? { match: { artist } } : {};
    const options = {
      group: ["album", "artist", "year"],
      ...match,
    };

    return axios.post(`/media/query`, options);
  },

  getGroupedByGenre: () => axios.post(`/media/query`, { group: ["genre"] }),
};
