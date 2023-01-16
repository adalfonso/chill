import { Media as MediaClass } from "../../common/models/Media.js";
import { getModelForClass } from "@typegoose/typegoose";
import { timestamps } from "./Base.mjs";

export const Media = getModelForClass(MediaClass, {
  schemaOptions: { timestamps, collection: "media" },
});
