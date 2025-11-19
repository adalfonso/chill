import { useDispatch, useSelector } from "react-redux";
import { useState } from "preact/hooks";

import { Select } from "@client/components/ui/Select";
import { updateUserSettings } from "@reducers/user";
import { AudioQuality, AudioQualityBitrate } from "@common/types";
import { api } from "@client/client";
import { useAppState } from "@hooks/useAppState";
import { getUserState } from "@reducers/store";

export const AudioQualitySetting = () => {
  const user = useSelector(getUserState);
  const { is_busy } = useAppState();
  const [input, setInput] = useState(
    user?.settings?.audio_quality ?? AudioQuality.Original,
  );

  const dispatch = useDispatch();

  const changeQuality = async (quality: AudioQuality) => {
    if (is_busy.value) {
      return;
    }
    is_busy.value = true;
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
      is_busy.value = false;
    }
  };

  const displayAsQuality = (key: AudioQuality) => {
    if (key === AudioQuality.Original) {
      return key;
    }

    return `${key} (~${AudioQualityBitrate[key]}kbps)`;
  };

  return (
    <div className="setting-audio-quality">
      <h2>Music quality</h2>

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
