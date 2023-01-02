import "./Toolbar.scss";
import React, { useState } from "react";
import { AdminSettings as AdminSettings } from "./Toolbar/AdminSettings";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Search } from "./Toolbar/Search";
import { UserSettings } from "./Toolbar/UserSettings";
import { faGear, faUser } from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router-dom";

type SettingsMenu = "user" | "admin";

export const Toolbar = () => {
  const [settings_vis, setSettingsVis] = useState({
    user: false,
    admin: false,
  });

  /**
   * Toggle the visibility of a menu
   *
   * @param type - menu type, e.g. admin, user
   */
  const toggleVis = (type: SettingsMenu) => () => {
    setSettingsVis({
      user: false,
      admin: false,
      [type]: !settings_vis[type],
    });
  };

  const history = useHistory();

  return (
    <div id="toolbar">
      <div className="libraries">
        <div onClick={() => history.push("/")}>Music</div>
        <div onClick={() => history.push("/playlists")}>Playlists</div>
      </div>

      <div className="tools">
        <Icon icon={faGear} size="lg" onClick={toggleVis("admin")} />
        {settings_vis.admin && (
          <AdminSettings onClose={toggleVis("admin")}></AdminSettings>
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
