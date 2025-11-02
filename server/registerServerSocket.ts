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

export type ChillWss = SocketServer<
  ClientSocketEvent,
  ClientSocketData,
  ServerSocketEvent,
  ServerSocketData
>;

export const registerServerSocket = (wss: ChillWss) => {
  const connector = new DeviceConnect();

  wss.on(ClientSocketEvent.Ping, (ws) =>
    wss.emit(ServerSocketEvent.Pong, ws, undefined),
  );

  wss.on(ClientSocketEvent.Identify, (ws, data) => {
    wss.identify(ws, data);

    // Connected devices
    const connection = getConnectionInfo(
      connector.inferConnections(ws.session_id),
    );

    if (connection.direction !== ConnectionDirection.None) {
      wss.emit(ServerSocketEvent.Reconnect, ws, { connection });
    }
  });

  wss.on(ClientSocketEvent.RequestConnection, (ws, data) => {
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

    wss.emit(ServerSocketEvent.RequestConnection, target, {
      from: ws.session_id,
    });
  });

  wss.on(ClientSocketEvent.DenyConnection, (ws, data) => {
    const taret = wss.getClientBySessionId(data.to);

    // Can't find target; skip
    if (!taret) {
      return;
    }

    wss.emit(ServerSocketEvent.DenyConnection, taret, {
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

  wss.on(ClientSocketEvent.Disconnect, (ws, data) => {
    const target = wss.getClientBySessionId(data.to);

    // Can't find target; skip
    if (!target) {
      return;
    }

    wss.emit(ServerSocketEvent.Disconnect, target, {
      from: ws.session_id,
    });
  });
};
