import { effect } from "@preact/signals";

import store from "@reducers/store";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { SenderType } from "@common/CommonEvent";
import { SocketClient } from "./SocketClient";
import { app_state } from "@client/state/AppState";
import { getDeviceInfo } from "./DeviceInfo";
import {
  addToQueue,
  next,
  pause,
  play,
  playNext,
  previous,
} from "@reducers/player";
import {
  ConnectionDirection,
  ServerSocketData,
  ServerSocketEvent,
} from "@common/SocketServerEvent";

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
    // Trigger the effect
    const _seconds = progress_s.value;

    if (!incoming_connections.peek().length) {
      return;
    }

    ws.emit(ClientSocketEvent.PlayerProgressUpdate, progress.peek());
  });

  const identify = () => ws.emit(ClientSocketEvent.Identify, getDeviceInfo());

  const ping = () => ws.emit(ClientSocketEvent.Ping);

  // Identify and begin ping when ready
  ws.ready.then(identify).then(ping);

  // Start ping-pong loop
  ws.on(ServerSocketEvent.Pong, () => setTimeout(ping, 5_000));

  ws.on(ServerSocketEvent.Connect, (data) => {
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

    const is_target = app_state.incoming_connections.value.length > 0;

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerPause, { sender: SenderType.Target });
    }
  });

  ws.on(ServerSocketEvent.PlayerPlay, (data) => {
    const is_target = app_state.incoming_connections.value.length > 0;

    // Make playback virtual for the source device
    store.dispatch(play({ ...data.payload, is_virtual: !is_target }));

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerPlay, {
        payload: data.payload,
        sender: SenderType.Target,
      });
    }
  });

  ws.on(ServerSocketEvent.PlayerPrevious, (data) => {
    const is_target = app_state.incoming_connections.value.length > 0;

    store.dispatch(previous({ is_virtual: !is_target }));

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerPrevious, {
        sender: SenderType.Target,
      });
    }
  });

  ws.on(ServerSocketEvent.PlayerNext, (data) => {
    const is_target = app_state.incoming_connections.value.length > 0;

    store.dispatch(next({ ...data.payload, is_virtual: !is_target }));

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerNext, {
        payload: data.payload,
        sender: SenderType.Target,
      });
    }
  });

  ws.on(ServerSocketEvent.PlayerPlayNext, (data) => {
    const is_target = app_state.incoming_connections.value.length > 0;

    store.dispatch(playNext({ tracks: data.payload, cast_info: null }));

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerPlayNext, {
        payload: data.payload,
        sender: SenderType.Target,
      });
    }
  });

  ws.on(ServerSocketEvent.PlayerAddToQueue, (data) => {
    const is_target = app_state.incoming_connections.value.length > 0;

    store.dispatch(addToQueue({ tracks: data.payload, cast_info: null }));

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerAddToQueue, {
        payload: data.payload,
        sender: SenderType.Target,
      });
    }
  });

  ws.on(
    ServerSocketEvent.PlayerProgressUpdate,
    (data) => (app_state.progress.value = data),
  );
};
