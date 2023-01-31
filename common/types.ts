import { Media } from "./models/Media.js";
import { MediaMatch } from "./media/types.js";

export type Nullable<T> = T | null;
export type ObjectValues<T> = T[keyof T];

export interface SearchResult {
  type: MediaMatch;
  displayAs: string[];
  value: string;
  path: string;
  score: number;
  match: Record<string, string | number>;
}

export type Grouped<T> = Omit<T, "_id"> & {
  _id: Record<string, string>;
  _count: number;
};

export type GroupedMedia = Grouped<Media> & {
  image?: string;
};

export interface PaginationOptions extends Record<string, string | number> {
  limit: number;
  page: number;
}

export const UserType = {
  User: "user",
  Admin: "admin",
};

export type UserType = ObjectValues<typeof UserType>;

export const AudioQuality = {
  Original: "original",
  Trash: "85",
  Low: "115",
  Medium: "165",
  Standard: "190",
  Extreme: "245",
} as const;

export type AudioQuality = ObjectValues<typeof AudioQuality>;
