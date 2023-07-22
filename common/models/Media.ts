import { Base } from "./Base";
import { MongoProjection, Nullable } from "@common/types";
import { z } from "zod";

export const query_options = z.object({
  limit: z.number().optional(),
  $nin: z.array(z.string()).optional(),
});

export interface AlbumCover {
  filename?: string;
  format?: string;
  data?: string;
  type?: string;
}

export interface Media extends Base {
  path: string;
  duration: number;
  artist: Nullable<string>;
  album: Nullable<string>;
  title: Nullable<string>;
  track: Nullable<number>;
  genre: Nullable<string>;
  year: Nullable<number>;
  cover?: AlbumCover;
  file_modified: Date;
  file_type: string;
}

export const base_projection: MongoProjection<Media> = {
  _id: 1,
  artist: 1,
  album: 1,
  genre: 1,
  duration: 1,
  title: 1,
  cover: {
    filename: 1,
  },
  file_type: 1,
  path: 1,
  track: 1,
  year: 1,
};
