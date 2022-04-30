import * as strCompare from "string-similarity";
import { Media } from "@common/autogen";

enum Category {
  Album = "album",
  Artist = "artist",
  Genre = "genre",
  Title = "title",
}

interface SearchResults {
  type: Category;
  displayAs: string;
  value: string;
  score: number;
}

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
 * @param carry accumulator
 * @returns processed categories
 */
const processFile = (
  file: Media,
  query: string,
  carry: Record<string, SearchResults>,
) => {
  const { artist, title, path } = file;
  const threshold = 0.5;

  return Object.values(Category).reduce((inner_carry, type) => {
    const compare_value = (file[type] ?? "").toLowerCase();
    const value = type === "title" ? path : file[type] ?? "";
    const key = `${type}|${value}`;
    const displayAs = type === "title" ? `${artist} - ${title}` : value;

    if (!compare_value || carry[key] !== undefined) {
      return inner_carry;
    }

    const score = strCompare.compareTwoStrings(compare_value, query);

    if (score < threshold && compare_value.indexOf(query) < 0) {
      return inner_carry;
    }

    return { ...inner_carry, [key]: { type, displayAs, value, score } };
  }, {});
};
