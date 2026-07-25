import type { JSX } from "preact";
import { useState } from "preact/hooks";

import "./ui.scss";
import { ChevronDownIcon } from "./icons/ChevronDownIcon";

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
          {displayAs ?? value} <ChevronDownIcon />
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
              {/* `<option>` is only valid inside a native <select>/<datalist>;
                  rendered standalone like this it's invalid markup, and iOS
                  WebKit applies its native menu-widget rendering to it even
                  outside that context, which was making the label invisible.
                  A plain <span> carries no such special-cased behavior. */}
              <span>{child.props.children}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
