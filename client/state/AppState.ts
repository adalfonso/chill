import { createContext } from "preact";
import { signal } from "@preact/signals";
import { SocketClient } from "@client/lib/SocketClient";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { ServerSocketData, ServerSocketEvent } from "@common/SocketServerEvent";
import { Maybe } from "@common/types";
import { registerClientSocket } from "@client/lib/registerClientSocket";
import { AppSettingType } from "@client/types";

export type AppState = ReturnType<typeof createAppState>;

const ws = new SocketClient<
  ClientSocketEvent,
  ClientSocketData,
  ServerSocketEvent,
  ServerSocketData
>();

let _app_state: Maybe<AppState> = null;

export const CoreViewState = {
  Library: "library",
  Search: "search",
  Settings: "settings",
  Router: "router",
} as const;

export type CoreViewState = (typeof CoreViewState)[keyof typeof CoreViewState];

export const createAppState = () => {
  const is_busy = signal(false);
  const progress = signal(0);
  const current_app_setting = signal<AppSettingType>(AppSettingType.None);
  const view_path = signal<string>("");

  // debounced version of progress
  const progress_s = signal(0);
  const incoming_connections = signal<Array<string>>([]);
  const outgoing_connection = signal<Maybe<string>>(null);

  const view = signal<CoreViewState>(CoreViewState.Library);

  return {
    current_app_setting,
    incoming_connections,
    is_busy,
    outgoing_connection,
    progress,
    progress_s,
    view,
    view_path,
    ws,
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
