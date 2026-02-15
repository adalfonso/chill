import { useState } from "preact/hooks";
import { useSignal } from "@preact/signals";

import { Select } from "@client/components/ui/Select";
import { AudioQuality, AudioQualityBitrate } from "@common/types";
import { api } from "@client/client";
import * as userStore from "@client/state/userStore";

export const AudioQualitySetting = () => {
  const is_busy = useSignal(false);
  const [input, setInput] = useState(
    userStore.settings.value?.audio_quality ?? AudioQuality.Original,
  );

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

      userStore.updateUserSettings(settings);
    } catch (e) {
      // TODO: show a toast here
      console.error("Failed to change audio quality:", e);

      // Reset on failure
      setInput(userStore.settings.value?.audio_quality ?? AudioQuality.Original);
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
    <div className="setting-audio-quality setting">
      <h2>Audio quality</h2>

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
