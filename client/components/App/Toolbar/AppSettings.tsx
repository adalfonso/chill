import { useSelector } from "react-redux";
import { useState } from "preact/hooks";

import "./AppSettings.scss";
import { AudioQualitySetting } from "./AppSettings/AudioQualitySetting";
import { Close } from "@client/components/ui/Close";
import { InviteUser } from "./AppSettings/InviteUser";
import { UserType } from "@common/types";
import { api } from "@client/client";
import { getState } from "@reducers/store";

type AppSettingsProps = {
  onClose: () => void;
};

export const AppSettings = ({ onClose }: AppSettingsProps) => {
  const [busy, setBusy] = useState(false);
  const { user } = useSelector(getState);

  // Cause file scanner to run
  // TODO: can this be refactored to use useFetch?
  const scan = async () => {
    if (busy) {
      return;
    }

    if (!confirm("Are you sure you want to run a scan?")) {
      return;
    }

    setBusy(true);
    await api.media.scan.mutate();
    setBusy(false);
  };

  return (
    <div className="fullscreen">
      <div id="app-settings">
        <Close onClose={onClose} />

        <div className="settings">
          <AudioQualitySetting user={user} />

          {user.type === UserType.Admin && <InviteUser />}

          {user.type === UserType.Admin && (
            <div className="link setting" onMouseUp={scan}>
              Run Scan Now!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
