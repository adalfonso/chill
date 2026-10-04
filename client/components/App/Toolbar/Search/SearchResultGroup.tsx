import { SearchResult, SearchResultType } from "@common/types";
import { SearchResultRow } from "./SearchResultRow";

type SearchGroupProps = {
  type: SearchResultType;
  items: Array<SearchResult>;
  /** How many of `items` to show before collapsing the rest */
  visible: number;
  onExpand: () => void;
  onVisit: (r: SearchResult) => void;
};

export const SearchResultGroup = ({
  type,
  items,
  visible,
  onExpand,
  onVisit,
}: SearchGroupProps) => {
  const hasMore = items.length > visible;

  return (
    <>
      <h4
        className={hasMore ? "more" : ""}
        onClick={hasMore ? onExpand : undefined}
      >
        {type.toUpperCase()}
      </h4>

      {items.slice(0, visible).map((result) => (
        <SearchResultRow
          key={result.displayAs.join("|") + result.value}
          result={result}
          onVisit={onVisit}
        />
      ))}
    </>
  );
};
