import { useEffect } from "preact/hooks";

import "./AppSettings.scss";
import { AccountSettings } from "./AppSettings/AccountSettings";
import { AmbiguousArtistGenre } from "./AppSettings/AmbiguousArtistGenre";
import { AppSetting } from "./AppSetting";
import { AppSettingType as SettingType } from "@client/types";
import { AudioQualitySetting } from "./AppSettings/AudioQualitySetting";
import { Close } from "@client/components/ui/Close";
import { FileTypeCounts } from "./AppSettings/FileTypeCounts";
import { InviteUser } from "./AppSettings/InviteUser";
import { LibraryScan } from "./AppSettings/LibraryScan";
import { LibraryStats } from "./AppSettings/LibraryStats";
import { LowQualityAlbums } from "./AppSettings/LowQualityAlbums";
import { NameDevice } from "./AppSettings/NameDevice";
import { TrackCountByYear } from "./TrackCountByYear";
import { UserType } from "@common/types";
import { noPropagate } from "@client/lib/Event";
import * as userStore from "@client/state/userStore";
import { screen_breakpoint_px } from "@client/lib/constants";
import { useAppState } from "@hooks/useAppState";
import { useViewport } from "@hooks/useViewport";

const settingsContent = {
  [SettingType.None]: <></>,
  [SettingType.Account]: <AccountSettings />,
  [SettingType.NameDevice]: <NameDevice />,
  [SettingType.MusicQuality]: <AudioQualitySetting />,
  [SettingType.InviteUser]: <InviteUser />,
  [SettingType.LibraryScan]: <LibraryScan />,
  [SettingType.LibraryInsights]: (
    <>
      <FileTypeCounts />
      <TrackCountByYear />
      <LibraryStats />
      <AmbiguousArtistGenre />
      <LowQualityAlbums />
    </>
  ),
} as const satisfies Record<SettingType, unknown>;

export const AppSettings = () => {
  const { current_app_setting } = useAppState();

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
    <div id="app-settings">
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

          <h3>Device</h3>
          <div className="settings-group">
            <AppSetting
              id={SettingType.NameDevice}
              title="Name device"
            ></AppSetting>
          </div>

          <h3>Library</h3>
          <div className="settings-group">
            {userStore.type.value === UserType.Admin && (
              <>
                <AppSetting id={SettingType.InviteUser} title="Invite a user" />
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
  );
};
