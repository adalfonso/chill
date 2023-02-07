import { Media } from "@common/models/Media";
import { MediaMatch } from "@common/media/types";
import { SearchResult } from "@common/types";
import { compareTwoStrings } from "string-similarity";

const Match = { ...MediaMatch, Path: "path" } as const;
type Match = (typeof Match)[keyof typeof Match];

const matcher: Record<Match, (file: Media) => unknown> = {
  artist: (file: Media) => ({ artist: file.artist }),
  genre: (file: Media) => ({ genre: file.genre }),
  path: (file: Media) => ({ path: file.path }),
  album: (file: Media) => ({
    album: file.album,
    artist: file.artist,
    year: file.year,
  }),
};

const displayer: Record<Match, (file: Media) => string[]> = {
  artist: (file: Media) => [`${file.artist}`, `Artist`],
  genre: (file: Media) => [`${file.genre}`, `Genre`],
  path: (file: Media) => [`${file.title}`, `Track - ${file.artist}`],
  album: (file: Media) => {
    const year = file.year ? `- ${file.year}` : ``;
    return [`${file.album}`, `Album ${year} by ${file.artist}`];
  },
};

const pathfinder: Record<Match, (file: Media) => string> = {
  artist: (file: Media) => `/artist/${encodeURIComponent(file.artist ?? "")}`,
  genre: (file: Media) => `/genre/${encodeURIComponent(file.genre ?? "")}`,
  path: (file: Media) => `/album/${encodeURIComponent(file.album ?? "")}`,
  album: (file: Media) => `/album/${encodeURIComponent(file.album ?? "")}`,
};

/**
 * Categorize and sort search results
 *
 * @param results search results
 * @param query  search query
 * @returns  categorized results
 */
export const sortResults = (results: { _doc: Media }[], query: string) => {
  const groups: Record<string, SearchResult> = results.reduce(
    (carry, result) => ({
      ...carry,
      ...processFile(result._doc, query, carry),
    }),
    {},
  );

  return Object.values(groups).sort((a, b) => b.score - a.score);
};

/**
 * Process a file against an accumulating list
 *
 * @param file media file
 * @param query search query
 * @param acc accumulator
 * @returns processed categories
 */
const processFile = (
  file: Media,
  query: string,
  acc: Record<string, SearchResult>,
) => {
  const { title, path } = file;
  const threshold = 0.5;

  return Object.values(Match).reduce((carry, type) => {
    const value = type === "path" ? path : file[type] ?? "";
    const key = `${type}|${value}`;
    const displayAs = displayer[type](file);
    const compare_value = (
      type === "path" ? title ?? "" : file[type] ?? ""
    ).toLowerCase();

    if (!compare_value || acc[key] !== undefined) {
      return carry;
    }

    const score = compareTwoStrings(compare_value, query);

    if (score < threshold && compare_value.indexOf(query) < 0) {
      return carry;
    }

    const match = matcher[type](file);
    const p = pathfinder[type](file);

    return {
      ...carry,
      [key]: { type, displayAs, value, score, match, path: p },
    };
  }, {});
};
