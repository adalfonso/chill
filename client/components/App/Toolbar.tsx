import { useLocation } from "wouter-preact";
import { useSelector } from "react-redux";
import { useState } from "preact/hooks";

import "./Toolbar.scss";
import { AppSettings as AppSettings } from "./Toolbar/AppSettings";
import { CastPlayer } from "./CastPlayer";
import { DeviceIcon } from "../ui/icons/DeviceIcon";
import { Devices } from "./Toolbar/Devices";
import { GearIcon } from "../ui/icons/GearIcon";
import { Search } from "./Toolbar/Search";

import { getCasterState } from "@client/state/reducers/store";
import { useBackNavigate, useAppState } from "@hooks/index";

type SettingsMenu = "app" | "devices";

export const Toolbar = () => {
  const { outgoing_connection, incoming_connections } = useAppState();
  const [settings_vis, setSettingsVis] = useState({
    app: false,
    devices: false,
  });
  const caster = useSelector(getCasterState);
  const [, navigate] = useLocation();

  const device_connected =
    outgoing_connection.value || incoming_connections.value.length > 0;

  /**
   * Toggle the visibility of a menu
   *
   * @param type - menu type, e.g. app, user
   */
  const toggleVis = (type: SettingsMenu) => () => {
    setSettingsVis({
      app: false,
      devices: false,
      [type]: !settings_vis[type],
    });
  };

  const hideMenus = () => setSettingsVis({ app: false, devices: false });

  // Minimize the player on back navigation when fullscreen
  useBackNavigate(
    // Override location change when either settings menu is open
    () => settings_vis.app,
    // Hide the playlist instead of changing location
    hideMenus,
  );

  return (
    <div id="toolbar">
      <div className="libraries">
        <div
          onClick={() => {
            hideMenus();
            navigate("/");
          }}
        >
          Music
        </div>
        <div
          onClick={() => {
            hideMenus();
            navigate("/playlists");
          }}
        >
          Playlists
        </div>
      </div>

      <div className="tools">
        {caster.ready && <google-cast-launcher></google-cast-launcher>}
        {/* Invisible, just used to mediate between redux stores */}
        <CastPlayer></CastPlayer>

        <DeviceIcon
          className="icon-sm"
          onClick={toggleVis("devices")}
          {...(device_connected && {
            stroke: "rgb(139, 195, 255)",
            strokeWidth: 2,
          })}
        />

        {settings_vis.devices && (
          <Devices onClose={toggleVis("devices")}></Devices>
        )}

        <GearIcon className="icon-sm" onClick={toggleVis("app")} />
        {settings_vis.app && (
          <AppSettings onClose={toggleVis("app")}></AppSettings>
        )}
      </div>
      <Search></Search>
    </div>
  );
};
