import axios from "axios";
import { PaginationOptions } from "@common/types";

const toQueryString = (options: Record<string, string | number>) =>
  `?${Object.entries(options)
    .map(([key, value]) => `${key}=${value.toString()}`)
    .join("&")}`;

export const PlaylistApi = {
  create: (name: string, items: string[]) =>
    axios.post(`/playlists`, { name, items }),
  index: (options: PaginationOptions) =>
    axios.get(`/playlists${toQueryString(options)}`),
  read: (id: string) => axios.get(`/playlist/${id}`),
  search: (query: string) => axios.post(`/playlist/search`, { query }),
  tracks: (id: string) => axios.get(`/playlist/${id}/tracks`),
  update: (id: string, items: string[]) =>
    axios.patch(`/playlist/${id}`, { items }),
};
