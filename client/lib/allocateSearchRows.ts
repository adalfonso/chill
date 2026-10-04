/** Total result rows the compact search preview may show across all groups */
export const SEARCH_ROW_BUDGET = 12;

/**
 * Split a row budget across result groups
 *
 * Groups are served smallest-first, each taking at most an equal share of
 * what's left. A group with fewer results than its share hands the unused
 * rows to the larger groups still waiting, so a category with no matches
 * costs nothing and a busy one can claim the slack.
 *
 * @param counts - number of results available per group
 * @param budget - total rows to distribute
 * @returns rows each group may show, never more than it has results for
 */
export const allocateSearchRows = <K>(
  counts: ReadonlyMap<K, number>,
  budget: number,
): Map<K, number> => {
  const ascending = [...counts.entries()].sort(([, a], [, b]) => a - b);

  return ascending.reduce(
    ({ allocation, remaining }, [key, count], index) => {
      const share = Math.max(
        1,
        Math.floor(remaining / (ascending.length - index)),
      );
      const rows = Math.min(count, share);

      return {
        allocation: allocation.set(key, rows),
        remaining: remaining - rows,
      };
    },
    { allocation: new Map<K, number>(), remaining: budget },
  ).allocation;
};
