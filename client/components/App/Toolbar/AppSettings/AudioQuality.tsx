import _ from "lodash";
import { AudioQuality as AudioQualityValues } from "@common/types";
import { AudioQuality as qualityList } from "@common/types";
import { Select } from "@client/components/ui/Select";
import { UserApi } from "@client/api/UserApi";
import { UserState } from "@reducers/user";
import { updateUserSettings } from "@reducers/user";
import { useDispatch } from "react-redux";
import { useState } from "react";

interface AudioQualityProps {
  user: UserState;
}

export const AudioQuality = ({ user }: AudioQualityProps) => {
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState(
    user?.settings?.audio_quality ?? qualityList.Original,
  );

  const dispatch = useDispatch();

  const changeQuality = async (quality: AudioQualityValues) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setInput(quality);

    try {
      const update = await UserApi.updateSettings({
        audio_quality: quality,
      });

      dispatch(updateUserSettings({ settings: update.data }));
    } catch (e) {
      // TODO: show a toast here

      // Reset on failure
      setInput(user?.settings?.audio_quality ?? qualityList.Original);
    } finally {
      setBusy(false);
    }
  };

  const displayAsQuality = (key, value: AudioQualityValues) => {
    if (value === AudioQualityValues.Original) {
      return key;
    }

    return `${key} (~${value}kbps)`;
  };

  return (
    <div className="audio-quality setting">
      <div>Audio Quality:</div>

      <Select
        onChange={changeQuality}
        displayAs={displayAsQuality(_.invert(AudioQualityValues)[input], input)}
        value={input}
      >
        {Object.entries(qualityList).map(([key, value]) => {
          return (
            <option key={key} value={value}>
              {displayAsQuality(key, value)}
            </option>
          );
        })}
      </Select>
    </div>
  );
};
