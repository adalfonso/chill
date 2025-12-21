import { SearchResult as Result } from "@common/types";

type SearchResultProps = {
  result: Result;
  onVisit: (file: Result) => void;
};

export const SearchResult = ({ result, onVisit }: SearchResultProps) => {
  const handleClick = () => onVisit(result);

  const [primary, secondary, ternary] = result.displayAs;

  const hasSecondary = secondary !== undefined;
  const hasTernary = ternary !== undefined;

  return (
    <div className={`result ${!hasSecondary && !hasTernary ? 'single' : ''}`} onClick={handleClick}>
      {primary}
      {hasSecondary && <div className="secondary">{secondary}</div>}
      {hasTernary && <div className="ternary">{ternary}</div>}
    </div>
  );
};
