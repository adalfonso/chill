import { ObjectValues } from "../types";

export const MediaMatch = {
  Artist: "artist",
  Album: "album",
  Genre: "genre",
} as const;

export type MediaMatch = ObjectValues<typeof MediaMatch>;
