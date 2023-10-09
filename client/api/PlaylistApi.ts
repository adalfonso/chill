import { PaginationOptions } from "@common/types";
import { client } from "../client";

export const PlaylistApi = {
  create: (name: string, items: string[]) =>
    client.playlist.create.mutate({ name, items }),

  index: (options: PaginationOptions) => client.playlist.index.query(options),

  get: (id: string) => client.playlist.get.query(id),

  search: (query: string) => client.playlist.search.query(query),

  tracks: (id: string, options?: PaginationOptions) =>
    client.playlist.tracks.query({ id, options }),

  update: (id: string, items: string[]) =>
    client.playlist.update.mutate({ id, items }),
};
