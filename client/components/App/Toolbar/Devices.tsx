import { api } from "@client/client";
import "./Devices.scss";
import { Close } from "@client/components/ui/Close";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { DeviceClient } from "@common/types";

type DevicesProps = {
  onClose: () => void;
};

export const Devices = ({ onClose }: DevicesProps) => {
  const busy = useSignal(false);
  const devices = useSignal<Array<DeviceClient>>([]);

  useEffect(() => {
    busy.value = true;
    api.cast.getAppClients
      .query()
      .then((data) => {
        devices.value = data;
      })
      .finally(() => (busy.value = false));
  }, []);

  return (
    <div className="fullscreen center-content transparent" onClick={onClose}>
      <div id="devices">
        <Close onClose={onClose} />
        <div className="device-list">
          {devices.value.map((device) => {
            return (
              <div key={device.session_id} className="device-client">
                {device.displayAs}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
