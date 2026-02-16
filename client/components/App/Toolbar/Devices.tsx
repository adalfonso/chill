import { effect, useSignal } from "@preact/signals";

import "./Devices.scss";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import { Close } from "@client/components/ui/Close";
import { DeviceClient, Maybe } from "@common/types";
import { WifiIcon } from "@client/components/ui/icons/WifiIcon";
import { api } from "@client/client";
import { noPropagate } from "@client/lib/Event";
import { useAppState } from "@hooks/useAppState";

type DevicesProps = {
  onClose: () => void;
};

export const Devices = ({ onClose }: DevicesProps) => {
  const { outgoing_connection, is_loading, ws } = useAppState();

  const devices = useSignal<Array<DeviceClient>>([]);
  const selected_device = useSignal<Maybe<DeviceClient>>(null);

  // Load devices on mount
  effect(() => {
    is_loading.value = true;
    api.cast.getAppClients
      .query()
      .then((data) => {
        devices.value = data;
      })
      .finally(() => (is_loading.value = false));
  });

  const selectDevice = (device: DeviceClient) =>
    noPropagate(() => {
      if (!device.is_this_device) {
        selected_device.value = device;
      }
    });

  const connect = noPropagate(() => {
    if (!selected_device.value) {
      return;
    }

    ws.emit(ClientSocketEvent.Connect, {
      to: selected_device.value.session_id,
    });

    selected_device.value = null;
  });

  const disconnect = noPropagate(() => {
    if (!outgoing_connection.value) {
      return;
    }

    ws.emit(ClientSocketEvent.Disconnect, { to: outgoing_connection.value });
    outgoing_connection.value = null;
  });

  return (
    <div className="fullscreen center-content transparent" onClick={onClose}>
      <div id="devices">
        <Close onClose={onClose} />
        {outgoing_connection.value && (
          <div className="device-disconnect" onClick={disconnect}>
            Disconnect
          </div>
        )}
        <div className="device-list">
          {devices.value.map((device) => {
            return (
              <div
                key={device.session_id}
                className="device-client"
                onClick={selectDevice(device)}
              >
                <div
                  className={`connected-icon ${outgoing_connection.value !== device.session_id ? "hidden" : ""}`}
                >
                  <WifiIcon stroke="rgb(139, 195, 255)" strokeWidth={2} />
                </div>
                <div className="device-info">
                  {device.device_name || device.session_id}
                  <div className="device-display-as">
                    {device.displayAs}
                    {device.is_this_device && " (this device)"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selected_device.value && (
          <div className="connect-to">
            <div
              className="cancel"
              onClick={noPropagate(() => (selected_device.value = null))}
            >
              Cancel
            </div>
            <div className="connect" onClick={connect}>
              Connect to {selected_device.value?.session_id}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
