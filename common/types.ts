import { MediaMatch } from "./media/types.js";

export type Nullable<T> = T | null;

export interface SearchResult {
  type: MediaMatch;
  displayAs: string[];
  value: string;
  path: string;
  score: number;
  match: Record<string, string | number>;
}

export interface PaginationOptions extends Record<string, string | number> {
  limit: number;
  page: number;
}

export enum UserType {
  User = "user",
  Admin = "admin",
}

export enum AudioQuality {
  Original = "original",
  Trash = "85",
  Low = "115",
  Medium = "165",
  Standard = "190",
  Extreme = "245",
}
