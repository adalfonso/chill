import "./AppSettings.scss";
import axios from "axios";
import { AudioQuality } from "./AppSettings/AudioQuality";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { UserType } from "@common/types";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { getState } from "@reducers/store";
import { useSelector } from "react-redux";
import { useState } from "react";

interface AppSettingsProps {
  onClose: () => void;
}

export const AppSettings = ({ onClose }: AppSettingsProps) => {
  const [busy, setBusy] = useState(false);
  const { user } = useSelector(getState);

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
    <div id="app-settings">
      <div className="close">
        <Icon icon={faClose} size="lg" onClick={onClose} />
      </div>
      <div>
        <AudioQuality user={user} />
        <br />
        {user.type === UserType.Admin && (
          <div className="link" onMouseUp={scan}>
            Run Scan Now!
          </div>
        )}
      </div>
    </div>
  );
};

const triggerScan = async () => axios.get("/api/v1/media/scan");
