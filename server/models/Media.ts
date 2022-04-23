import * as mongoose from "mongoose";

const { Schema } = mongoose;

export const MediaSchema = new Schema({
  path: { type: String, required: true, index: true },
  artist: { type: String, default: null },
  album: { type: String, default: null },
  title: { type: String, default: null },
  track: { type: Number, default: null },
  genre: { type: String, default: null },
  year: { type: Number, default: null },
  file_modified: { type: Date, required: true },
  file_type: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  modified_at: { type: Date, default: Date.now },
});

export const Media = mongoose.model("Media", MediaSchema, "media");
