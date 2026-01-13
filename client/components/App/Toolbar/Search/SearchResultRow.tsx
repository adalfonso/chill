import { SearchResult } from "@common/types";

type SearchResultProps = {
  result: SearchResult;
  onVisit: (file: SearchResult) => void;
};

export const SearchResultRow = ({ result, onVisit }: SearchResultProps) => {
  const handleClick = () => onVisit(result);

  const [primary, secondary, ternary] = result.displayAs;

  const hasSecondary = secondary !== undefined;
  const hasTernary = ternary !== undefined;

  return (
    <div
      className={`result ${!hasSecondary && !hasTernary ? "single" : ""}`}
      onClick={handleClick}
    >
      {primary}
      {hasSecondary && <div className="secondary">{secondary}</div>}
      {hasTernary && <div className="ternary">{ternary}</div>}
    </div>
  );
};
