import "./Toolbar.scss";
import React, { useState } from "react";
import axios from "axios";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Search } from "./Search";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router-dom";

export const Toolbar = () => {
  const [busy, setBusy] = useState(false);
  const history = useHistory();

  // Cause file scanner to run
  const scan = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    await triggerScan();
    setBusy(false);
  };

  return (
    <div id="toolbar">
      <div className="libraries">
        <div className="library-title" onClick={() => history.push("/")}>
          Music
        </div>
      </div>

      <div className="tools">
        <div onClick={scan}>Scan</div>
        <Icon icon={faGear} size="lg" />
      </div>
      <Search></Search>
    </div>
  );
};

const triggerScan = async () => axios.get("/media/scan");
