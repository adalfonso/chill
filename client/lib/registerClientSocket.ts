import { effect } from "@preact/signals";

import * as player from "@client/state/playerStore";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { PlayableTrackWithIndex } from "@common/types";
import { SenderType } from "@common/CommonEvent";
import { SocketClient } from "./SocketClient";
import { getAppState } from "@client/state/AppState";
import { getDeviceInfo } from "./DeviceInfo";
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

  ws.onSync(identify);

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

  ws.on(ServerSocketEvent.Ping, () => {
    ws.emit(ClientSocketEvent.Pong);
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

    player.pause();

    const is_target = incoming_connections.value.length > 0;

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerPause, { sender: SenderType.Target });
    }
  });

  ws.on(ServerSocketEvent.PlayerPlay, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    // Make playback virtual for the source device
    player.play({ ...data.payload, is_virtual: !is_target });

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

    player.previous({ is_virtual: !is_target });

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerPrevious, {
        sender: SenderType.Target,
      });
    } else {
      player.setIsPlaying();
    }
  });

  ws.on(ServerSocketEvent.PlayerNext, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    player.next({ ...data.payload, is_virtual: !is_target });

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerNext, {
        payload: data.payload,
        sender: SenderType.Target,
      });
    } else {
      player.setIsPlaying();
    }
  });

  ws.on(ServerSocketEvent.PlayerPlayNext, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    player.playNext({ tracks: data.payload, cast_info: null });

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

    player.addToQueue({ tracks: data.payload, cast_info: null });

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

    let tracks: Array<PlayableTrackWithIndex> = [];

    // Only set (shuffled) tracks in payload if the target took this action
    // Otherwise the target will do this in registerClientSocket
    if (is_source && !player.is_shuffled.value) {
      tracks = data.payload;
    }

    player.shuffle(tracks);

    if (is_target) {
      ws.emit(ServerSocketEvent.PlayerShuffle, {
        payload: player.playlist.value,
        sender: SenderType.Target,
      });
    }
  });

  ws.on(ServerSocketEvent.PlayerSeek, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    if (is_target) {
      player.seek(data.payload);
    }

    // Do not propagate because target already emites progress update
  });

  ws.on(ServerSocketEvent.PlayerChangeVolume, (data) => {
    const { incoming_connections } = getAppState();
    const is_target = incoming_connections.value.length > 0;

    player.changeVolume(data.payload);

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
      ws.emit(ServerSocketEvent.PlayerReconnect, {
        payload: player.getSnapshot(),
        to: data.from,
      });
    }

    if (is_source && "payload" in data) {
      player.replaceState(data.payload);
    }
  });

  ws.on(
    ServerSocketEvent.PlayerProgressUpdate,
    (data) => (getAppState().progress.value = data),
  );
};
