import "./Settings.scss";
import { useState } from "react";
import axios from "axios";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";

interface AppSettingsProps {
  onClose: () => void;
}

export const AppSettings = ({ onClose }: AppSettingsProps) => {
  const [busy, setBusy] = useState(false);

  // Cause file scanner to run
  // TODO: can this be refactored to use useFetch?
  const scan = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    await triggerScan();
    setBusy(false);
  };

  return (
    <div id="settings">
      <div className="close">
        <Icon icon={faClose} size="lg" onClick={onClose} />
      </div>
      <div onClick={scan}>Scan</div>
    </div>
  );
};

const triggerScan = async () => axios.get("/api/v1/media/scan");
