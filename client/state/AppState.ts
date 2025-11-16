import { createContext } from "preact";
import { signal } from "@preact/signals";
import { SocketClient } from "@client/lib/SocketClient";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { ServerSocketData, ServerSocketEvent } from "@common/SocketServerEvent";
import { Maybe } from "@common/types";
import { registerClientSocket } from "@client/lib/registerClientSocket";

export type AppState = ReturnType<typeof createAppState>;

const ws = new SocketClient<
  ClientSocketEvent,
  ClientSocketData,
  ServerSocketEvent,
  ServerSocketData
>();

let _app_state: Maybe<AppState> = null;

export const createAppState = () => {
  const is_busy = signal(false);
  const progress = signal(0);

  // debounced version of progress
  const progress_s = signal(0);
  const incoming_connections = signal<Array<string>>([]);
  const outgoing_connection = signal<Maybe<string>>(null);

  return {
    is_busy,
    progress,
    progress_s,
    ws,
    incoming_connections,
    outgoing_connection,
  };
};

export const getAppState = (): AppState => {
  if (!_app_state) {
    _app_state = createAppState();
  }
  return _app_state;
};

registerClientSocket(ws);

export const AppContext = createContext(getAppState());
