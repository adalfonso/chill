import {
  SharedEvent,
  SharedSocketData,
  TargetEvent,
  TargetSocketData,
} from "./SharedEvent";

export const ServerSocketEvent = Object.assign({}, SharedEvent, TargetEvent, {
  AcceptConnection: "AcceptConnection",
  Connect: "Connect",
  DenyConnection: "DenyConnection",
  Disconnect: "Disconnect",
  Pong: "Pong",
  Reconnect: "Reconnect",
} as const) satisfies Record<keyof ServerSocketData, string>;

export type ServerSocketEvent =
  (typeof ServerSocketEvent)[keyof typeof ServerSocketEvent];

export type ServerSocketData = SharedSocketData &
  TargetSocketData & {
    AcceptConnection: { from: string };
    Connect: { from: string };
    DenyConnection: { from: string; reason: string };
    Disconnect: { from: string };
    Pong: undefined;
    Reconnect: { connection: ConnectionInfo };
  };

export type ConnectionInfo =
  | {
      direction: typeof ConnectionDirection.None;
    }
  | {
      target: string;
      direction: typeof ConnectionDirection.Out;
    }
  | {
      sources: Array<string>;
      direction: typeof ConnectionDirection.In;
    };

export const ConnectionDirection = {
  Out: "Out",
  In: "In",
  None: "None",
} as const;

export type ConnectionDirection =
  (typeof ConnectionDirection)[keyof typeof ConnectionDirection];
