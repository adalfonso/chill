import { Playlist as IPlaylist } from "@common/models/Playlist";
import { timestamps } from "./Base";
import { model, Schema } from "mongoose";

export const PlaylistSchema = new Schema<IPlaylist>(
  {
    name: { type: String, required: true, unique: true },
    items: { type: [String], required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps, collection: "playlist" },
);

PlaylistSchema.index({ name: "text" });

export const Playlist = model<IPlaylist>("Playlist", PlaylistSchema);
