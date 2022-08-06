import axios from "axios";
import { PaginationOptions } from "@common/types";

const v1 = `/api/v1`;

const toQueryString = (options: Record<string, string | number>) =>
  `?${Object.entries(options)
    .map(([key, value]) => `${key}=${value.toString()}`)
    .join("&")}`;

export const PlaylistApi = {
  create: (name: string, items: string[]) =>
    axios.post(`${v1}/playlists`, { name, items }),
  index: (options: PaginationOptions) =>
    axios.get(`${v1}/playlists${toQueryString(options)}`),
  read: (id: string) => axios.get(`${v1}/playlist/${id}`),
  search: (query: string) => axios.post(`${v1}/playlist/search`, { query }),
  tracks: (id: string) => axios.get(`${v1}/playlist/${id}/tracks`),
  update: (id: string, items: string[]) =>
    axios.patch(`${v1}/playlist/${id}`, { items }),
};
