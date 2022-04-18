import axios from "axios";
import { MediaTypeFilter } from "common/MediaType/types";

interface MediaTypeGetOptions {
  filter: MediaTypeFilter;
}

export const MediaTypeApi = {
  get: (options: MediaTypeGetOptions) => {
    const { filter } = options;

    return axios.get(`/media?filter=${filter}`);
  },
};
