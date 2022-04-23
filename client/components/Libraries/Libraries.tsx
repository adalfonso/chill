import "./Libraries.scss";
import * as React from "react";
import { useHistory } from "react-router-dom";

export const Libraries = () => {
  const history = useHistory();

  return (
    <div id="libraries">
      <div className="library-title" onClick={() => history.push("/")}>
        Music
      </div>
    </div>
  );
};
