import axios from "axios";
import { MediaMatch as Match } from "@common/MediaType/types";

type MatchMap = Record<Match, string>;

export const MediaApi = {
  query: (match: MatchMap) => axios.post(`/media/query`, { match }),

  getGroupedByArtist: () => axios.post(`/media/query`, { group: ["artist"] }),

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
