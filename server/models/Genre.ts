import { Genre as IGenre } from "@common/models/Genre";
import { model, Schema } from "mongoose";
import { timestamps } from "./Base";

const GenreSchema = new Schema<IGenre>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps, collection: "genre" },
);

GenreSchema.index({
  name: "text",
});

export const Genre = model<IGenre>("Genre", GenreSchema);
