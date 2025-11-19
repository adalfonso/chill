import { useSelector } from "react-redux";

import "./AppSettings.scss";
import { AudioQualitySetting } from "./AppSettings/AudioQualitySetting";
import { Close } from "@client/components/ui/Close";
import { InviteUser } from "./AppSettings/InviteUser";
import { UserType } from "@common/types";
import { getUserState } from "@reducers/store";
import { AppSetting } from "./AppSetting";
import { noPropagate } from "@client/lib/Event";
import { FileTypeCounts } from "./AppSettings/FileTypeCounts";
import { AmbiguousArtistGenre } from "./AppSettings/AmbiguousArtistGenre";
import { LibraryScan } from "./AppSettings/LibraryScan";
import { AppSettingType as SettingType } from "@client/types";
import { useAppState } from "@hooks/useAppState";
import { screen_breakpoint_px } from "@client/lib/constants";
import { useViewport } from "@hooks/useViewport";
import { AccountSettings } from "./AppSettings/AccountSettings";
import { useEffect } from "preact/hooks";
import { LibraryStats } from "./AppSettings/LibraryStats";
import { LowQualityAlbums } from "./AppSettings/LowQualityAlbums";

type AppSettingsProps = {
  onClose: () => void;
};

const settingsContent = {
  [SettingType.None]: <></>,
  [SettingType.Account]: <AccountSettings />,
  [SettingType.MusicQuality]: <AudioQualitySetting />,
  [SettingType.InviteUser]: <InviteUser />,
  [SettingType.LibraryScan]: <LibraryScan />,
  [SettingType.LibraryInsights]: (
    <>
      <FileTypeCounts />
      <LibraryStats />
      <AmbiguousArtistGenre />
      <LowQualityAlbums />
    </>
  ),
} as const satisfies Record<SettingType, unknown>;

export const AppSettings = ({ onClose }: AppSettingsProps) => {
  const { current_app_setting } = useAppState();
  const user = useSelector(getUserState);
  const { width } = useViewport();
  const is_mobile = width < screen_breakpoint_px;

  useEffect(() => {
    if (is_mobile) {
      current_app_setting.value = SettingType.None;
    } else if (current_app_setting.value === SettingType.None) {
      current_app_setting.value = SettingType.Account;
    }
  }, [is_mobile]);

  return (
    <div className="fullscreen">
      <div id="app-settings">
        <Close onClose={onClose} />
        <h2 className="settings-header">Settings</h2>
        <div className="settings-body">
          <div className="settings-list">
            <h3>Account</h3>
            <div className="settings-group">
              <AppSetting
                id={SettingType.Account}
                title="Account settings"
              ></AppSetting>
            </div>

            <h3>Playback & Audio</h3>
            <div className="settings-group">
              <AppSetting
                id={SettingType.MusicQuality}
                title="Audio quality"
              ></AppSetting>
            </div>

            <h3>Library</h3>
            <div className="settings-group">
              {user.type === UserType.Admin && (
                <>
                  <AppSetting
                    id={SettingType.InviteUser}
                    title="Invite a user"
                  />
                  <AppSetting
                    id={SettingType.LibraryScan}
                    title="Scan library files"
                  />
                </>
              )}

              <AppSetting
                id={SettingType.LibraryInsights}
                title="Library insights"
              />
            </div>
          </div>

          <div className={`settings-content ${current_app_setting.value}`}>
            <Close
              onClose={noPropagate(
                () => (current_app_setting.value = SettingType.None),
              )}
            />

            {settingsContent[current_app_setting.value]}
          </div>
        </div>
      </div>
    </div>
  );
};
