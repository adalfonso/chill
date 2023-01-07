import { MediaMatch } from "./media/types.js";

export type Nullable<T> = T | null;

export interface SearchResult {
  type: MediaMatch;
  displayAs: string;
  value: string;
  path: string;
  score: number;
  match: Record<string, string | number>;
}

export interface PaginationOptions extends Record<string, string | number> {
  limit: number;
  page: number;
}
