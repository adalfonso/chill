import { MAX_SEARCH_RESULTS_VISIBLE } from "../Search";
import { SearchResult, SearchResultType } from "@common/types";
import { SearchResultRow } from "./SearchResultRow";

type SearchGroupProps = {
  type: SearchResultType;
  items: Array<SearchResult>;
  onExpand: () => void;
  onVisit: (r: SearchResult) => void;
};

export const SearchResultGroup = ({
  type,
  items,
  onExpand,
  onVisit,
}: SearchGroupProps) => {
  const hasMore = items.length > MAX_SEARCH_RESULTS_VISIBLE;

  return (
    <>
      <h4
        className={hasMore ? "more" : ""}
        onClick={hasMore ? onExpand : undefined}
      >
        {type.toUpperCase()}
      </h4>

      {items.slice(0, MAX_SEARCH_RESULTS_VISIBLE).map((result) => (
        <SearchResultRow
          key={result.displayAs.join("|") + result.value}
          result={result}
          onVisit={onVisit}
        />
      ))}
    </>
  );
};
