import { useEffect, useState } from "preact/hooks";
import { useSelector } from "react-redux";
import { useSignal } from "@preact/signals";

import "./AppSettings.scss";
import { AudioQualitySetting } from "./AppSettings/AudioQualitySetting";
import { Close } from "@client/components/ui/Close";
import { InviteUser } from "./AppSettings/InviteUser";
import { UserType } from "@common/types";
import { api } from "@client/client";
import { getUserState } from "@reducers/store";
import { FileTypeGraph } from "./AppSettings/FileTypeGraph";

type AppSettingsProps = {
  onClose: () => void;
};

export const AppSettings = ({ onClose }: AppSettingsProps) => {
  const fileTypeCounts = useSignal({} as Record<string, number>);
  const [busy, setBusy] = useState(false);
  const user = useSelector(getUserState);

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

  useEffect(() => {
    api.media.byFileType
      .query()
      .then((result) => (fileTypeCounts.value = result));
  }, []);

  return (
    <div className="fullscreen">
      <div id="app-settings">
        <Close onClose={onClose} />

        <div className="settings">
          {Object.keys(fileTypeCounts.value).length && (
            <FileTypeGraph data={fileTypeCounts} />
          )}
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
