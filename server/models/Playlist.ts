import mongoose from "mongoose";

const { Schema } = mongoose;

export const PlaylistSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true, index: true, unique: true },
  items: { type: [Schema.Types.ObjectId], required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const PlaylistModel = mongoose.model(
  "Playlist",
  PlaylistSchema,
  "playlist",
);
