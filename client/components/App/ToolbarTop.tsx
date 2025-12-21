import { useLocation } from "wouter-preact";
import { useSelector } from "react-redux";
import { useState } from "preact/hooks";

import "./ToolbarTop.scss";
import { CastPlayer } from "./CastPlayer";
import { CoreViewState } from "@client/state/AppState";
import { DeviceIcon } from "../ui/icons/DeviceIcon";
import { Devices } from "./Toolbar/Devices";
import { getCasterState } from "@client/state/reducers/store";
import { noPropagate } from "@client/lib/Event";
import { useAppState } from "@hooks/useAppState";
import { PlaylistIcon } from "../ui/icons/PlaylistIcon";
import { DottedListIcon } from "../ui/icons/DottedListIcon";

type SettingsMenu = "devices";

export const ToolbarTop = () => {
  const { view, outgoing_connection, incoming_connections } = useAppState();
  const [settings_vis, setSettingsVis] = useState({
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
      [type]: !settings_vis[type],
    });
  };

  const hideMenus = () => setSettingsVis({ devices: false });

  return (
    <div id="toolbar-top">
      <div className="libraries">
        <div
          onClick={() => {
            hideMenus();
            view.value = CoreViewState.Router;
            navigate("/playlists");
          }}
        >
          <DottedListIcon className="icon-xs" />
        </div>
      </div>

      <div className="tools">
        {caster.ready && <google-cast-launcher></google-cast-launcher>}

        {/* Invisible, just used to mediate between redux stores */}
        <CastPlayer></CastPlayer>

        <DeviceIcon
          className="icon-sm"
          onClick={noPropagate(toggleVis("devices"))}
          {...(device_connected && {
            stroke: "rgb(139, 195, 255)",
            strokeWidth: 2,
          })}
        />

        {settings_vis.devices && (
          <Devices onClose={toggleVis("devices")}></Devices>
        )}
      </div>
    </div>
  );
};
