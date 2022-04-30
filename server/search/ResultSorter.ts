import * as strCompare from "string-similarity";
import { Media } from "@common/autogen";
import { MediaMatch } from "@common/MediaType/types";

interface SearchResults {
  type: MediaMatch;
  displayAs: string;
  value: string;
  score: number;
  match: Record<string, string | number>;
}

const matcher: Record<MediaMatch, (file: Media) => unknown> = {
  artist: (file: Media) => ({ artist: file.artist }),
  genre: (file: Media) => ({ genre: file.genre }),
  path: (file: Media) => ({ path: file.path }),
  album: (file: Media) => ({
    album: file.album,
    artist: file.artist,
    year: file.year,
  }),
};

const displayer: Record<MediaMatch, (file: Media) => string[]> = {
  artist: (file: Media) => [`Artist: ${file.artist}`],
  genre: (file: Media) => [`Genre: ${file.genre}`],
  path: (file: Media) => [`${file.title}`, `song by ${file.artist}`],
  album: (file: Media) => {
    const year = file.year ? `(${file.year})` : ``;
    return [`${file.album} ${year}`, `album by ${file.artist}`];
  },
};

/**
 * Categorize and sort search results
 *
 * @param results search results
 * @param query  search query
 * @returns  categorized results
 */
export const sortResults = (results: { _doc: Media }[], query: string) => {
  const groups: Record<string, SearchResults> = results.reduce(
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
  acc: Record<string, SearchResults>,
) => {
  const { title, path } = file;
  const threshold = 0.5;

  return Object.values(MediaMatch).reduce((carry, type) => {
    const value = type === "path" ? path : file[type] ?? "";
    const key = `${type}|${value}`;
    const displayAs = displayer[type](file);
    const compare_value = (
      type === "path" ? title : file[type] ?? ""
    ).toLowerCase();

    if (!compare_value || acc[key] !== undefined) {
      return carry;
    }

    const score = strCompare.compareTwoStrings(compare_value, query);

    if (score < threshold && compare_value.indexOf(query) < 0) {
      return carry;
    }

    const match = matcher[type](file);

    return { ...carry, [key]: { type, displayAs, value, score, match } };
  }, {});
};
