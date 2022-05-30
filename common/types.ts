import { MediaMatch } from "./media/types";

export type Nullable<T> = T | null;

export interface SearchResult {
  type: MediaMatch;
  displayAs: string;
  value: string;
  score: number;
  match: Record<string, string | number>;
}
