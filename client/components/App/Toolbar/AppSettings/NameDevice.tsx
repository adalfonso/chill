import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

import { getDeviceInfo } from "@client/lib/DeviceInfo";
import { getAppState } from "@client/state/AppState";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import { useDebounce } from "@hooks/useDebounce";

export const NameDevice = () => {
  const device_name = useSignal("");
  const { ws } = getAppState();

  useEffect(() => {
    const stored_name = localStorage.getItem("device_name") || "";
    device_name.value = stored_name;
  }, []);

  useDebounce(
    () => {
      localStorage.setItem("device_name", device_name.value);
      ws.emit(ClientSocketEvent.Identify, getDeviceInfo());
    },
    [device_name.value],
    300,
  );

  return (
    <div className="setting-name-device setting">
      <h2>Name device</h2>

      <input
        type="text"
        value={device_name.value}
        placeholder="Enter device name"
        onChange={(e) =>
          (device_name.value = (e.target as HTMLInputElement).value ?? "")
        }
      />
    </div>
  );
};
