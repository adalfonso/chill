import {
  AlbumCover as IAlbumCover,
  Media as IMedia,
} from "@common/models/Media";
import { timestamps } from "./Base";
import { model, Schema } from "mongoose";

const AlbumCoverSchema = new Schema<IAlbumCover>({
  filename: { type: String },
  format: { type: String },
  data: { type: String },
  type: { type: String },
});

const MediaSchema = new Schema<IMedia>(
  {
    path: { type: String, required: true, index: true },
    duration: { type: Number, required: true },
    artist: { type: String, default: null },
    album: { type: String, default: null },
    cover: { type: AlbumCoverSchema, required: false },
    title: { type: String, default: null },
    track: { type: Number, default: null },
    genre: { type: String, default: null },
    year: { type: Number, default: null },
    file_modified: { type: Date, required: true },
    file_type: { type: String, required: true },
  },
  { timestamps, collection: "media" },
);

MediaSchema.index({
  artist: "text",
  album: "text",
  title: "text",
});

export const Media = model<IMedia>("Media", MediaSchema);
