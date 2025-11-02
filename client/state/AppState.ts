import { createContext } from "preact";
import { signal } from "@preact/signals";
import { SocketClient } from "@client/lib/SocketClient";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { ServerSocketData, ServerSocketEvent } from "@common/SocketServerEvent";
import { Maybe } from "@common/types";
import { registerClientSocket } from "@client/lib/registerClientSocket";

const ws = new SocketClient<
  ClientSocketEvent,
  ClientSocketData,
  ServerSocketEvent,
  ServerSocketData
>();

registerClientSocket(ws);

export const createAppState = () => {
  const is_busy = signal(false);
  const progress = signal(0);
  const incoming_connections = signal<Array<string>>([]);
  const outgoing_connections = signal<Maybe<string>>(null);

  return { is_busy, progress, ws, incoming_connections, outgoing_connections };
};

// Create a *single shared instance* of app state
export const app_state = createAppState();

export const AppContext = createContext(app_state);
