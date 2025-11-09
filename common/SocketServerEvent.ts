import { PlayerState } from "@reducers/player";
import {
  DuplexEvent,
  DuplexSocketData,
  TargetEvent,
  TargetSocketData,
} from "./CommonEvent";

export const ServerSocketEvent = Object.assign({}, DuplexEvent, TargetEvent, {
  AcceptConnection: "AcceptConnection",
  Connect: "Connect",
  DenyConnection: "DenyConnection",
  Disconnect: "Disconnect",
  PlayerReconnect: "PlayerReconnect",
  Pong: "Pong",
  Reconnect: "Reconnect",
} as const) satisfies Record<keyof ServerSocketData, string>;

export type ServerSocketEvent =
  (typeof ServerSocketEvent)[keyof typeof ServerSocketEvent];

export type ServerSocketData = DuplexSocketData &
  TargetSocketData & {
    AcceptConnection: { from: string };
    Connect: { from: string };
    DenyConnection: { from: string; reason: string };
    Disconnect: { from: string };
    Pong: undefined;
    Reconnect: { connection: ConnectionInfo };
    PlayerReconnect: { from: string } | { payload: PlayerState };
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
