import "./Toolbar.scss";
import * as React from "react";
import axios from "axios";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

export const Toolbar = () => {
  const [busy, setBusy] = useState(false);

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
      <div onClick={scan}>Scan</div>
      <Icon icon={faGear} size="lg" />
    </div>
  );
};

const triggerScan = async () => {
  await axios.get("/media/scan");
};
