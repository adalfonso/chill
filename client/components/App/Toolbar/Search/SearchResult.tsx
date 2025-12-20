import { SearchResult as Result } from "@common/types";

type SearchResultProps = {
  result: Result;
  onVisit: (file: Result) => void;
};

export const SearchResult = ({ result, onVisit }: SearchResultProps) => {
  const handleClick = () => onVisit(result);

  const [primary, secondary, ternary] = result.displayAs;

  return (
    <div className="result" onClick={handleClick}>
      {primary}
      {secondary !== undefined && <div className="secondary">{secondary}</div>}
      {ternary !== undefined && <div className="ternary">{ternary}</div>}
    </div>
  );
};
