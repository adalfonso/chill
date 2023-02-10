import "./Toolbar.scss";
import { AppSettings as AppSettings } from "./Toolbar/AppSettings";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Search } from "./Toolbar/Search";
import { UserSettings } from "./Toolbar/UserSettings";
import { faGear, faUser } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { useBackNavigate } from "@hooks/useBackNavigate";
import { useState } from "react";

type SettingsMenu = "user" | "app";

export const Toolbar = () => {
  const [settings_vis, setSettingsVis] = useState({
    user: false,
    app: false,
  });

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

  const navigate = useNavigate();

  return (
    <div id="toolbar">
      <div className="libraries">
        <div onClick={() => navigate("/")}>Music</div>
        <div onClick={() => navigate("/playlists")}>Playlists</div>
      </div>

      <div className="tools">
        <Icon icon={faGear} size="lg" onClick={toggleVis("app")} />
        {settings_vis.app && (
          <AppSettings onClose={toggleVis("app")}></AppSettings>
        )}

        <Icon icon={faUser} size="lg" onClick={toggleVis("user")} />
        {settings_vis.user && (
          <UserSettings setVis={toggleVis("user")}></UserSettings>
        )}
      </div>
      <Search></Search>
    </div>
  );
};
