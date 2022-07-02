import axios from "axios";

export const PlaylistApi = {
  create: (name: string, items: string[]) =>
    axios.post(`/playlists`, { name, items }),
};
