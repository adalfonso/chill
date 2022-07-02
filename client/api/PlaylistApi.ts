import axios from "axios";

export const PlaylistApi = {
  create: (name: string, items: string[]) =>
    axios.post(`/playlists`, { name, items }),
  update: (id: string, items: string[]) =>
    axios.patch(`/playlist/${id}`, { items }),
  search: (query: string) => axios.post(`/playlist/search`, { query }),
};
