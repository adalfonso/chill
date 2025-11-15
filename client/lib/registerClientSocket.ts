import { effect } from "@preact/signals";

import store, { getPlayerState } from "@reducers/store";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { PlayableTrackWithIndex } from "@common/types";
import { SenderType } from "@common/CommonEvent";
import { SocketClient } from "./SocketClient";
import { getAppState } from "@client/state/AppState";
import { getDeviceInfo } from "./DeviceInfo";
import {
  addToQueue,
  changeVolume,
  next,
  pause,
  play,
  playNext,
  previous,
  replaceState,
  seek,
  setIsPlaying,
  shuffle,
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
    const { incoming_connections, progress, progress_s, ws } = getAppState();
    // Trigger the effect
    const _seconds = progress_s.value;

    if (!incoming_connections.peek().length) {
      return;
    }

    ws.emit(ClientSocketEvent.PlayerProgressUpdate, progress.peek());
  });

  const identify = () => ws.emit(ClientSocketEvent.Identify, getDeviceInfo());

  ws.ready().then(identify);

  ws.onWake(identify);

  ws.on(ServerSocketEvent.Connect, (data) => {
    const { outgoing_connection, incoming_connections } = getAppState();

    // This app is already controlling another instance
    if (outgoing_connection.value) {
      return ws.emit(ClientSocketEvent.DenyConnection, {
        to: data.from,
        reason: "Busy",
      });
    }

    ws.emit(ClientSocketEvent.AcceptConnection, { to: data.from });

    incoming_connections.value = [...incoming_connections.value, data.from];
  });

  ws.on(ServerSocketEvent.AcceptConnection, (data) => {
    const { outgoing_connection } = getAppState();

    outgoing_connection.value = data.from;

    ws.emit(ClientSocketEvent.PlayerReconnect, undefined);
  });

  ws.on(ServerSocketEvent.Disconnect, (data) => {
    const { incoming_connections } = getAppState();

    incoming_connections.value = incoming_connections.value.filter(
      (value) => value !== data.from,
    );
  });

  ws.on(ServerSocketEvent.Reconnect, (data) => {
    const { outgoing_connection, incoming_connections } = getAppState();
    if (data.connection.direction === ConnectionDirection.In) {
      incoming_connections.value = data.connection.sources;
    } else if (data.connection.direction === ConnectionDirection.Out) {
      outgoing_connection.value = data.connection.target;

      ws.emit(ClientSocketEvent.PlayerReconnect, undefined);
    }
  });

  ws.on(ServerSocketEvent.PlayerPause, () => {
    const { incoming_connections } = getAppState();

    store.dispatch(pause());

    const is_target = incoming_connections.value.length > 0;

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerPause, { sender: SenderType.Target });
    }
  });

  ws.on(ServerSocketEvent.PlayerPlay, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

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
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    store.dispatch(previous({ is_virtual: !is_target }));

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerPrevious, {
        sender: SenderType.Target,
      });
    } else {
      store.dispatch(setIsPlaying());
    }
  });

  ws.on(ServerSocketEvent.PlayerNext, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    store.dispatch(next({ ...data.payload, is_virtual: !is_target }));

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerNext, {
        payload: data.payload,
        sender: SenderType.Target,
      });
    } else {
      store.dispatch(setIsPlaying());
    }
  });

  ws.on(ServerSocketEvent.PlayerPlayNext, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    store.dispatch(playNext({ tracks: data.payload, cast_info: null }));

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerPlayNext, {
        payload: data.payload,
        sender: SenderType.Target,
      });
    }
  });

  ws.on(ServerSocketEvent.PlayerAddToQueue, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    store.dispatch(addToQueue({ tracks: data.payload, cast_info: null }));

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerAddToQueue, {
        payload: data.payload,
        sender: SenderType.Target,
      });
    }
  });

  ws.on(ServerSocketEvent.PlayerShuffle, (data) => {
    const { incoming_connections, outgoing_connection } = getAppState();
    const is_target = incoming_connections.value.length > 0;
    const is_source = outgoing_connection.value;
    let player = getPlayerState(store.getState());

    let tracks: Array<PlayableTrackWithIndex> = [];

    // Only set (shuffled) tracks in payload if the target took this action
    // Otherwise the target will do this in registerClientSocket
    if (is_source && !player.is_shuffled) {
      tracks = data.payload;
    }

    store.dispatch(shuffle(tracks));

    if (is_target) {
      // Refresh player state
      player = getPlayerState(store.getState());

      ws.emit(ServerSocketEvent.PlayerShuffle, {
        payload: player.playlist,
        sender: SenderType.Target,
      });
    }
  });

  ws.on(ServerSocketEvent.PlayerSeek, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    if (is_target) {
      store.dispatch(seek(data.payload));
    }

    // Do not propagate because target already emites progress update
  });

  ws.on(ServerSocketEvent.PlayerChangeVolume, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    store.dispatch(changeVolume(data.payload));

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerChangeVolume, {
        payload: data.payload,
        sender: SenderType.Target,
      });
    }
  });

  ws.on(ServerSocketEvent.PlayerReconnect, (data) => {
    const { incoming_connections, outgoing_connection } = getAppState();
    const is_target = incoming_connections.value.length > 0;
    const is_source = outgoing_connection.value;

    if (is_target && "from" in data) {
      const player = getPlayerState(store.getState());

      ws.emit(ServerSocketEvent.PlayerReconnect, {
        payload: player,
        to: data.from,
      });
    }

    if (is_source && "payload" in data) {
      store.dispatch(replaceState(data.payload));
    }
  });

  ws.on(
    ServerSocketEvent.PlayerProgressUpdate,
    (data) => (getAppState().progress.value = data),
  );
};
