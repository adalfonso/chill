import { AudioQuality as qualityList } from "@common/types";
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

  const changeQuality = async (e) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setInput(e.target.value);

    try {
      const update = await UserApi.updateSettings({
        audio_quality: e.target.value,
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

  return (
    <div className="audio-quality">
      <div>Audio Quality</div>
      <select onChange={changeQuality} value={input}>
        {Object.entries(qualityList).map(([key, value]) => {
          return (
            <option key={key} value={value}>
              {key} {value !== "original" && `(~${value}kbps)`}
            </option>
          );
        })}
      </select>
    </div>
  );
};
