import store from "@reducers/store";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { SocketClient } from "./SocketClient";
import { app_state } from "@client/state/AppState";
import { getDeviceInfo } from "./DeviceInfo";
import { pause, play } from "@reducers/player";
import {
  ConnectionDirection,
  ServerSocketData,
  ServerSocketEvent,
} from "@common/SocketServerEvent";
import { effect, untracked } from "@preact/signals";

export const registerClientSocket = (
  ws: SocketClient<
    ClientSocketEvent,
    ClientSocketData,
    ServerSocketEvent,
    ServerSocketData
  >,
) => {
  effect(() => {
    const { incoming_connections, progress, progress_s, ws } = app_state;

    if (!incoming_connections.value.length) {
      return;
    }

    // Trigger the effect
    const _seconds = progress_s.value;

    ws.emit(ClientSocketEvent.PlayerProgressUpdate, progress.peek());
  });

  const identify = () => ws.emit(ClientSocketEvent.Identify, getDeviceInfo());

  const ping = () => ws.emit(ClientSocketEvent.Ping);

  // Identify and begin ping when ready
  ws.ready.then(identify).then(ping);

  // Start ping-pong loop
  ws.on(ServerSocketEvent.Pong, () => setTimeout(ping, 5_000));

  ws.on(ServerSocketEvent.RequestConnection, (data) => {
    // This app is already controlling another instance
    if (app_state.outgoing_connection.value) {
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

    app_state.outgoing_connection.value = data.from;
  });

  ws.on(ServerSocketEvent.Disconnect, (data) => {
    app_state.incoming_connections.value =
      app_state.incoming_connections.value.filter(
        (value) => value !== data.from,
      );
  });

  ws.on(ServerSocketEvent.Reconnect, (data) => {
    if (data.connection.direction === ConnectionDirection.In) {
      app_state.incoming_connections.value = data.connection.sources;
    } else if (data.connection.direction === ConnectionDirection.Out) {
      app_state.outgoing_connection.value = data.connection.target;
    }
  });

  ws.on(ServerSocketEvent.PlayerPause, () => {
    store.dispatch(pause());
  });

  ws.on(ServerSocketEvent.PlayerPlay, (data) => {
    store.dispatch(play(data));

    ws.emit(ServerSocketEvent.PlayerSync, { ...data, lazy: true });
  });

  ws.on(ServerSocketEvent.PlayerSync, (data) => {
    store.dispatch(play(data));
  });

  ws.on(
    ServerSocketEvent.PlayerProgressUpdate,
    (data) => (app_state.progress.value = data),
  );
};
