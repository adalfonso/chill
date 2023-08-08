import { Genre } from "@common/models/Genre";
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

type MultiResults = {
  media: { _doc: Media }[];
  genre: { _doc: Genre }[];
};

/**
 * Categorize and sort search results
 *
 * @param results search results
 * @param search_term  search query
 * @returns  categorized results
 */
export const sortResults = (results: MultiResults, search_term: string) => {
  const media_groups: Record<string, SearchResult> = results.media.reduce(
    (carry, result) => ({
      ...carry,
      ...processFile(result._doc, search_term, carry),
    }),
    {},
  );

  const genre_groups: Record<string, SearchResult> = results.genre.reduce(
    (carry, result) => ({
      ...carry,
      ...processGenre(result._doc, search_term, carry),
    }),
    media_groups,
  );

  return Object.values({ ...media_groups, ...genre_groups }).sort(
    (a, b) => b.score - a.score,
  );
};

/**
 * Process a file against an accumulating list
 *
 * @param file media file
 * @param search_term search query
 * @param acc accumulator
 * @returns processed categories
 */
const processFile = (
  file: Media,
  search_term: string,
  acc: Record<string, SearchResult>,
): Record<string, SearchResult> => {
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

    const score = compareTwoStrings(
      compare_value.toLowerCase(),
      search_term.toLowerCase(),
    );

    // Filter out similar strings that don't actually have a bonafide match
    if (score < threshold && compare_value.indexOf(search_term) < 0) {
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

/**
 * Process a genre against an accumulating list
 *
 * @param genre media file
 * @param search_term search query
 * @param acc accumulator
 * @returns processed categories
 */
const processGenre = (
  genre: Genre,
  search_term: string,
  acc: Record<string, SearchResult>,
): Record<string, SearchResult> => {
  const { name } = genre;
  const key = `genre|${name}`;

  // Accumulating object already found a match for this
  if (acc[key] !== undefined) {
    return {};
  }

  const score = compareTwoStrings(
    name.toLowerCase(),
    search_term.toLowerCase(),
  );

  return {
    [key]: {
      type: Match.Genre,
      displayAs: [name, "Genre"],
      path: `/genre/${name}`,
      score: score,
      value: name,
      match: {
        [Match.Genre]: name,
      },
    },
  };
};
