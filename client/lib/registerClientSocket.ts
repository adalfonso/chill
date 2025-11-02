import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { SocketClient } from "./SocketClient";
import { getDeviceInfo } from "./DeviceInfo";
import { ServerSocketData, ServerSocketEvent } from "@common/SocketServerEvent";
import { app_state } from "@client/state/AppState";

export const registerClientSocket = (
  ws: SocketClient<
    ClientSocketEvent,
    ClientSocketData,
    ServerSocketEvent,
    ServerSocketData
  >,
) => {
  const identify = () => ws.emit(ClientSocketEvent.Identify, getDeviceInfo());

  const ping = () => ws.emit(ClientSocketEvent.Ping, undefined);

  // Identify and begin ping when ready
  ws.ready.then(identify).then(ping);

  // Start ping-pong loop
  ws.on(ServerSocketEvent.Pong, () => setTimeout(ping, 5_000));

  ws.on(ServerSocketEvent.RequestConnection, (data) => {
    // This app is already controlling another instance
    if (app_state.outgoing_connections.value) {
      return ws.emit(ClientSocketEvent.DenyConnection, {
        to: data.from,
        reason: "Busy",
      });
    }

    // should also update app state here

    ws.emit(ClientSocketEvent.AcceptConnection, { to: data.from });

    app_state.incoming_connections.value = [
      ...app_state.incoming_connections.value,
      data.from,
    ];
  });

  ws.on(ServerSocketEvent.AcceptConnection, (data) => {
    // TODO: Some sort of check that the connection is ok/safe. maybe the server should handle this
    // should also update app state here

    app_state.outgoing_connections.value = data.from;
  });

  ws.on(ServerSocketEvent.Disconnect, (data) => {
    app_state.incoming_connections.value =
      app_state.incoming_connections.value.filter(
        (value) => value !== data.from,
      );
  });
};
