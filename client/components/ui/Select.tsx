import "./ui.scss";
import { useState } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";
import { MediaMatch as Match } from "@common/media/types";

interface SelectProps {
  onChange: (match: Match) => void;
  children: JSX.Element[];
  value: Match;
  displayAs: string;
}

export const Select = ({
  onChange,
  children,
  value,
  displayAs,
}: SelectProps) => {
  const [expanded, setExpanded] = useState(false);

  const select = (value: Match) => () => {
    onChange(value);
    setExpanded(false);
  };

  return (
    <div className="ui-select">
      <div className="selection" onClick={() => setExpanded(!expanded)}>
        {displayAs ?? value} <Icon icon={faAngleDown} size="sm" />
      </div>
      <div className={expanded ? "children" : "children hidden"}>
        {children.map((child) => {
          return (
            <div
              onClick={select(child.props.value)}
              className={value === child.props.value ? "selected" : ""}
              key={child.props.value}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
};
