import {
  EnforcableSharedSocketData,
  SharedSocketEvent,
} from "./SharedSocketEvent";

export const ClientSocketEvent = Object.assign({}, SharedSocketEvent, {
  Identify: "Identify",
  Ping: "Ping",
} as const);

export type ClientSocketEvent =
  (typeof ClientSocketEvent)[keyof typeof ClientSocketEvent];

const EnforcableClientSocketData = Object.assign(
  {},
  EnforcableSharedSocketData,
  {
    Identify: { type: "Desktop", browser: "Chrome", os: "Linux" },
    Ping: undefined,
  },
) satisfies Record<ClientSocketEvent, unknown>;

export type ClientSocketData = typeof EnforcableClientSocketData;
