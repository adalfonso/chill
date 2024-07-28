import { useDispatch } from "react-redux";
import { useState } from "react";

import { Select } from "@client/components/ui/Select";
import { UserState } from "@reducers/user";
import { updateUserSettings } from "@reducers/user";
import { AudioQuality, AudioQualityBitrate } from "@common/types";
import { api } from "@client/client";

type AudioQualityProps = {
  user: UserState;
};

export const AudioQualitySetting = ({ user }: AudioQualityProps) => {
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState(
    user?.settings?.audio_quality ?? AudioQuality.Original,
  );

  const dispatch = useDispatch();

  const changeQuality = async (quality: AudioQuality) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setInput(quality);

    try {
      const settings = await api.user.settings.mutate({
        audio_quality: quality,
      });

      dispatch(updateUserSettings({ settings }));
    } catch (e) {
      // TODO: show a toast here
      console.error("Failed to change audio quality:", e);

      // Reset on failure
      setInput(user?.settings?.audio_quality ?? AudioQuality.Original);
    } finally {
      setBusy(false);
    }
  };

  const displayAsQuality = (key: AudioQuality) => {
    if (key === AudioQuality.Original) {
      return key;
    }

    return `${key} (~${AudioQualityBitrate[key]}kbps)`;
  };

  return (
    <div className="audio-quality setting">
      <div>Audio Quality:</div>

      <Select
        onChange={changeQuality}
        displayAs={displayAsQuality(input)}
        value={input}
      >
        {Object.values(AudioQuality).map((value) => {
          return (
            <option key={value} value={value}>
              {displayAsQuality(value)}
            </option>
          );
        })}
      </Select>
    </div>
  );
};
