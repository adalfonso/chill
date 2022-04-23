import axios from "axios";
import { MediaTypeFilter as Filter } from "@common/MediaType/types";

interface MediaGetOptions {
  filter: Filter;
}

export const MediaApi = {
  get: (options: MediaGetOptions) => {
    const { filter } = options;

    return axios.get(`/media?filter=${filter}`);
  },

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
