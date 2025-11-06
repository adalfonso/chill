import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";

import { SocketServer } from "./lib/io/SocketServer";
import {
  ConnectionStatus,
  DeviceConnect,
  getConnectionInfo,
} from "./lib/io/DeviceConnect";
import {
  ConnectionDirection,
  ServerSocketData,
  ServerSocketEvent,
} from "@common/SocketServerEvent";
import { isNotNullish } from "@common/commonUtils";
import { DuplexEvent, SenderType, TargetEvent } from "@common/CommonEvent";

export type ChillWss = SocketServer<
  ClientSocketEvent,
  ClientSocketData,
  ServerSocketEvent,
  ServerSocketData
>;

export const registerServerSocket = (wss: ChillWss) => {
  const connector = new DeviceConnect();

  // ---- General Client Events ----
  wss.on(ClientSocketEvent.Ping, (ws) => wss.emit(ServerSocketEvent.Pong, ws));

  wss.on(ClientSocketEvent.Identify, (ws, data) => {
    wss.identify(ws, data);

    // Connected devices
    const connection = getConnectionInfo(
      connector.inferActiveConnections(ws.session_id),
    );

    if (connection.direction !== ConnectionDirection.None) {
      wss.emit(ServerSocketEvent.Reconnect, ws, { connection });
    }
  });

  // ---- Client Source -> Target Events ----
  wss.on(ClientSocketEvent.Connect, (ws, data) => {
    // Cannot connect to itself
    if (ws.session_id === data.to) {
      return;
    }

    const target = wss
      //  Tie this to the requester's user_id to limit access
      .getAccessibleClients(ws.user_id)
      .find((client) => client.session_id === data.to);

    if (!target) {
      return wss.emit(ServerSocketEvent.DenyConnection, ws, {
        from: "SERVER",
        reason: "Target client not connected",
      });
    }

    connector.requestConnection(ws.session_id, data.to);

    wss.emit(ServerSocketEvent.Connect, target, {
      from: ws.session_id,
    });
  });

  wss.on(ClientSocketEvent.Disconnect, (ws, data) => {
    connector.disconnect(ws.session_id);

    const target = wss.getClientBySessionId(data.to);

    // Can't find target; skip
    if (!target) {
      return;
    }

    wss.emit(ServerSocketEvent.Disconnect, target, {
      from: ws.session_id,
    });
  });

  // ---- Client Target -> Source Events ----
  wss.on(ClientSocketEvent.DenyConnection, (ws, data) => {
    const target = wss.getClientBySessionId(data.to);

    // Can't find target; skip
    if (!target) {
      return;
    }

    wss.emit(ServerSocketEvent.DenyConnection, target, {
      from: ws.session_id,
      reason: data.reason,
    });
  });

  wss.on(ClientSocketEvent.AcceptConnection, (ws, data) => {
    // Cannot connect to itself
    if (ws.session_id === data.to) {
      return;
    }

    const target = wss
      //  Tie this to the requester's user_id to limit access
      .getAccessibleClients(ws.user_id)
      .find((client) => client.session_id === data.to);

    if (!target) {
      return;
    }

    const connection = connector.getConnection(data.to, ws.session_id);

    if (!connection) {
      return console.error(
        `Cannot find connection for source ${data.to}, target ${ws.session_id}`,
      );
    }

    if (connection.status !== ConnectionStatus.Requested) {
      return console.error(
        `Found connection for source ${data.to}, target ${ws.session_id} but status is not ${ConnectionStatus.Requested}`,
      );
    }

    connector.acceptConnection(data.to, ws.session_id);

    wss.emit(ServerSocketEvent.AcceptConnection, target, {
      from: ws.session_id,
    });
  });

  // ---- Client Target -> Source (proxied) Events ----
  // All events sent from target need to just be proxied to all sources
  Object.values(TargetEvent).forEach((event) => {
    wss.on(event, (ws, data) => {
      const connections = connector.getConnectionsByTargetId(ws.session_id);

      connections
        .map((connection) => wss.getClientBySessionId(connection.source))
        .filter(isNotNullish)
        .forEach((target) => {
          wss.emit(event, target, data);
        });
    });
  });

  // ---- Client <=> Client Events ----
  Object.values(DuplexEvent).forEach((event) => {
    wss.on(event, (ws, data) => {
      const { sender } = data;

      if (sender === SenderType.Target) {
        return connector
          .getConnectionsByTargetId(ws.session_id)
          .map((connection) => wss.getClientBySessionId(connection.source))
          .filter(isNotNullish)
          .forEach((target) => {
            wss.emit(event, target, data);
          });
      }

      const connection = connector.getConnectionBySourceId(ws.session_id);

      if (!connection) {
        return;
      }

      const target = wss.getClientBySessionId(connection.target);

      // Can't find target; skip
      if (!target) {
        return;
      }

      wss.emit(event, target, data);
    });
  });
};
