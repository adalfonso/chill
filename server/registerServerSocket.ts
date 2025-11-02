import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { ServerSocketData, ServerSocketEvent } from "@common/SocketServerEvent";
import { SocketServer } from "./lib/io/SocketServer";

export type ChillWss = SocketServer<
  ClientSocketEvent,
  ClientSocketData,
  ServerSocketEvent,
  ServerSocketData
>;

export const registerServerSocket = (wss: ChillWss) => {
  wss.on(ClientSocketEvent.Ping, (ws) =>
    wss.emit(ServerSocketEvent.Pong, ws, undefined),
  );

  wss.on(ClientSocketEvent.Identify, wss.identify);

  wss.on(ClientSocketEvent.RequestConnection, (ws, data) => {
    const target = wss.getClientBySessionId(data.to);

    if (!target) {
      return wss.emit(ServerSocketEvent.DenyConnection, ws, {
        from: "SERVER",
        reason: "Target client not connected",
      });
    }

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
    const target = wss.getClientBySessionId(data.to);

    // Can't find target; skip
    if (!target) {
      return;
    }

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
