import { Base } from "./Base";
import { Nullable } from "@common/types";

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
