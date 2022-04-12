import * as React from "react";
import "./Toolbar.scss";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";

export const Toolbar = () => {
  return (
    <div id="toolbar">
      <Icon icon={faGear} size="lg" />
    </div>
  );
};
