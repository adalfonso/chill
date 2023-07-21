import { Media } from "./models/Media";
import { MediaMatch } from "./media/types";

export type Nullable<T> = T | null;
export type ObjectValues<T> = T[keyof T];
export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export type MongoProjection<T> = {
  [P in keyof T]?: MongoProjection<T[P]> | 1 | 0;
};

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
