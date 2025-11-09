import { PlayerState } from "@reducers/player";
import {
  DuplexEvent,
  DuplexSocketData,
  TargetEvent,
  TargetSocketData,
} from "./CommonEvent";

export const ClientSocketEvent = Object.assign({}, DuplexEvent, TargetEvent, {
  AcceptConnection: "AcceptConnection",
  Connect: "Connect",
  DenyConnection: "DenyConnection",
  Disconnect: "Disconnect",
  Identify: "Identify",
  Ping: "Ping",
  PlayerReconnect: "PlayerReconnect",
} as const) satisfies Record<keyof ClientSocketData, unknown>;

export type ClientSocketEvent =
  (typeof ClientSocketEvent)[keyof typeof ClientSocketEvent];

export type ClientSocketData = DuplexSocketData &
  TargetSocketData & {
    AcceptConnection: { to: string };
    Connect: { to: string };
    DenyConnection: { to: string; reason: string };
    Disconnect: { to: string };
    Identify: { type: string; browser: string; os: string };
    Ping: undefined;
    PlayerReconnect: undefined | { to: string; payload: PlayerState };
  };
