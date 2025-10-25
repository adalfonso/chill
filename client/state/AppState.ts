import { createContext } from "preact";
import { signal } from "@preact/signals";
import { SocketClient } from "@client/lib/SocketClient";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { ServerSocketData, ServerSocketEvent } from "@common/SocketServerEvent";

const ws = new SocketClient<
  ClientSocketEvent,
  ClientSocketData,
  ServerSocketEvent,
  ServerSocketData
>();

const ping = () => ws.emit(ClientSocketEvent.Ping, undefined);

// Start ping when ready
ws.ready.then(ping);

// Start ping-pong loop
ws.on(ServerSocketEvent.Pong, () => setTimeout(() => ping, 5_000));

export const createAppState = () => {
  const is_busy = signal(false);
  const progress = signal(0);

  return { is_busy, progress, ws };
};

export const AppContext = createContext(createAppState());
