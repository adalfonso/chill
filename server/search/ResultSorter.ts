import * as strCompare from "string-similarity";

/**
 * Categorize and sort search results
 *
 * @param results search results
 * @param query  search query
 * @returns  categorized results
 */
export const sortResults = (results: any[], query: string) => {
  const groups = { album: {}, artist: {}, genre: {}, title: {} };

  results.forEach(({ _doc: result }) => {
    const { artist, title, path } = result;
    const threshold = 0.5;

    // Determine how the file's artist, album, genre, and title scored
    const scores = Object.keys(groups).reduce((scores, type) => {
      const value = (result[type] ?? "").toLowerCase();
      const score = strCompare.compareTwoStrings(value, query);

      return { ...scores, [type]: score };
    }, {});

    // Record file into differen categories that it scores highly in
    Object.entries(scores)
      .filter(([_, score]) => score > threshold)
      .forEach(([type, score]) => {
        const value = type === "title" ? path : result[type] ?? "";
        const displayAs = type === "title" ? `${artist} - ${title}` : value;

        if (!value || groups[type][value] !== undefined) {
          return;
        }

        groups[type][value] = {
          type,
          displayAs,
          value,
          score,
        };
      });
  });

  return Object.entries(groups)
    .reduce((carry, [_, group]) => [...carry, ...Object.values(group)], [])
    .sort((a, b) => b.score - a.score);
};
