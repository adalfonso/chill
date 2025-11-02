import { createContext } from "preact";
import { signal } from "@preact/signals";
import { SocketClient } from "@client/lib/SocketClient";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { ServerSocketData, ServerSocketEvent } from "@common/SocketServerEvent";
import { getDeviceInfo } from "@client/lib/DeviceInfo";
import { Maybe } from "@common/types";

type Connections = {
  incoming: Array<string>;
  outgoing: Maybe<string>;
};

const ws = new SocketClient<
  ClientSocketEvent,
  ClientSocketData,
  ServerSocketEvent,
  ServerSocketData
>();

const identify = () => ws.emit(ClientSocketEvent.Identify, getDeviceInfo());

const ping = () => ws.emit(ClientSocketEvent.Ping, undefined);

// Identify and begin ping when ready
ws.ready.then(identify).then(ping);

// Start ping-pong loop
ws.on(ServerSocketEvent.Pong, () => setTimeout(ping, 5_000));

export const createAppState = () => {
  const is_busy = signal(false);
  const progress = signal(0);
  const connections = signal<Connections>({ incoming: [], outgoing: null });

  return { is_busy, progress, ws, connections };
};

export const AppContext = createContext(createAppState());
