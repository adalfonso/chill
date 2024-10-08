import { useLocation } from "wouter-preact";
import { useSelector } from "react-redux";
import { useState } from "preact/hooks";

import "./Toolbar.scss";
import { AppSettings as AppSettings } from "./Toolbar/AppSettings";
import { CastPlayer } from "./CastPlayer";
import { GearIcon } from "../ui/icons/GearIcon";
import { Search } from "./Toolbar/Search";
import { UserIcon } from "../ui/icons/UserIcon";
import { UserSettings } from "./Toolbar/UserSettings";
import { getCasterState } from "@client/state/reducers/store";
import { useBackNavigate } from "@hooks/index";

type SettingsMenu = "user" | "app";

export const Toolbar = () => {
  const [settings_vis, setSettingsVis] = useState({ user: false, app: false });
  const caster = useSelector(getCasterState);
  const [, navigate] = useLocation();

  /**
   * Toggle the visibility of a menu
   *
   * @param type - menu type, e.g. app, user
   */
  const toggleVis = (type: SettingsMenu) => () => {
    setSettingsVis({
      user: false,
      app: false,
      [type]: !settings_vis[type],
    });
  };

  // Minimize the player on back navigation when fullscreen
  useBackNavigate(
    // Override location change when either settings menu is open
    () => settings_vis.app || settings_vis.user,
    // Hide the playlist instead of changing location
    () => setSettingsVis({ app: false, user: false }),
  );

  return (
    <div id="toolbar">
      <div className="libraries">
        <div onClick={() => navigate("/")}>Music</div>
        <div onClick={() => navigate("/playlists")}>Playlists</div>
      </div>

      <div className="tools">
        {caster.ready && <google-cast-launcher></google-cast-launcher>}
        {/* Invisible, just used to mediate between redux stores */}
        <CastPlayer></CastPlayer>

        <GearIcon className="icon-sm" onClick={toggleVis("app")} />
        {settings_vis.app && (
          <AppSettings onClose={toggleVis("app")}></AppSettings>
        )}

        <UserIcon className="icon-sm" onClick={toggleVis("user")} />
        {settings_vis.user && (
          <UserSettings setVis={toggleVis("user")}></UserSettings>
        )}
      </div>
      <Search></Search>
    </div>
  );
};
