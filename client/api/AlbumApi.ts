import axios from "axios";

export const AlbumApi = {
  index: (filter: Record<string, string>) => {
    const query = Object.entries(filter)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const query_string = query ? `?${query}` : "";

    return axios.get(`/api/albums${query_string}`);
  },
};
