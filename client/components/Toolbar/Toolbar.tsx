import "./Toolbar.scss";
import * as React from "react";
import axios from "axios";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Search } from "./Search";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router-dom";
import { useState } from "react";

export const Toolbar = ({ onPlay }) => {
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
      <Search onPlay={onPlay}></Search>
      <div className="tools">
        <div onClick={scan}>Scan</div>
        <Icon icon={faGear} size="lg" />
      </div>
    </div>
  );
};

const triggerScan = async () => axios.get("/media/scan");
