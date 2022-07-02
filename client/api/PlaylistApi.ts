import axios from "axios";
import { PaginationOptions } from "@common/types";

const toQueryString = (options: Record<string, string | number>) =>
  `?${Object.entries(options)
    .map(([key, value]) => `${key}=${value.toString()}`)
    .join("&")}`;

export const PlaylistApi = {
  index: (options: PaginationOptions) =>
    axios.get(`/playlists${toQueryString(options)}`),
  create: (name: string, items: string[]) =>
    axios.post(`/playlists`, { name, items }),
  update: (id: string, items: string[]) =>
    axios.patch(`/playlist/${id}`, { items }),
  search: (query: string) => axios.post(`/playlist/search`, { query }),
};
