import React from "react";

export const SearchResult = ({ result, onPlay, onVisit }) => {
  // const handleClick = useMultiClick(
  //   // single click
  //   () => onVisit(result),
  //   // double click
  //   () => onPlay(result),
  //   200,
  // );

  const handleClick = () => onVisit(result);

  const [primary, secondary] = result.displayAs;

  return (
    <div className="result" onClick={handleClick}>
      {primary}
      {secondary !== undefined && <div className="secondary">{secondary}</div>}
    </div>
  );
};
