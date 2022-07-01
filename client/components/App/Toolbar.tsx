import "./Toolbar.scss";
import React, { useState } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Search } from "./Toolbar/Search";
import { Settings } from "./Toolbar/Settings";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router-dom";

export const Toolbar = () => {
  const [settingsAreVisible, setSettingsAreVisible] = useState(false);
  const history = useHistory();

  return (
    <div id="toolbar">
      <div className="libraries">
        <div className="library-title" onClick={() => history.push("/")}>
          Music
        </div>
      </div>

      <div className="tools">
        <Icon
          icon={faGear}
          size="lg"
          onClick={() => setSettingsAreVisible(!settingsAreVisible)}
        />
        {settingsAreVisible && (
          <Settings onClose={() => setSettingsAreVisible(false)}></Settings>
        )}
      </div>
      <Search></Search>
    </div>
  );
};
