import {
  SharedEvent,
  SharedSocketData,
  TargetEvent,
  TargetSocketData,
} from "./SharedEvent";

export const ClientSocketEvent = Object.assign({}, SharedEvent, TargetEvent, {
  AcceptConnection: "AcceptConnection",
  Connect: "Connect",
  DenyConnection: "DenyConnection",
  Disconnect: "Disconnect",
  Identify: "Identify",
  Ping: "Ping",
} as const) satisfies Record<keyof ClientSocketData, unknown>;

export type ClientSocketEvent =
  (typeof ClientSocketEvent)[keyof typeof ClientSocketEvent];

export type ClientSocketData = SharedSocketData &
  TargetSocketData & {
    AcceptConnection: { to: string };
    Connect: { to: string };
    DenyConnection: { to: string; reason: string };
    Disconnect: { to: string };
    Identify: { type: string; browser: string; os: string };
    Ping: undefined;
  };
