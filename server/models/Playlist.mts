import { Playlist as PlaylistClass } from "../../common/models/Playlist.js";
import { getModelForClass } from "@typegoose/typegoose";
import { timestamps } from "./Base.mjs";

export const Playlist = getModelForClass(PlaylistClass, {
  schemaOptions: { timestamps, collection: "playlist" },
});
