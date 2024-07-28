import { useState } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";

import "./ui.scss";

type SelectProps<T> = {
  onChange: (match: T) => void;
  children: JSX.Element[];
  value: T;
  displayAs: string;
};

export const Select = <T,>({
  onChange,
  children,
  value,
  displayAs,
}: SelectProps<T>) => {
  const [expanded, setExpanded] = useState(false);

  const select = (value: T) => () => {
    onChange(value);
    setExpanded(false);
  };

  return (
    <div className="ui-select">
      <div className="selection" onClick={() => setExpanded(!expanded)}>
        <>
          {displayAs ?? value} <Icon icon={faAngleDown} size="sm" />
        </>
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
