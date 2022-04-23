import axios from "axios";
import { MediaMatch as Match } from "@common/MediaType/types";

type MatchMap = Record<Match, string | number>;

export const MediaApi = {
  query: (match: MatchMap) => axios.post(`/media/query`, { match }),

  getGroupedByArtist: (genre: string) => {
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
