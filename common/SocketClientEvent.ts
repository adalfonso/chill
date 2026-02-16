import { PlayerState, DeviceInfo } from "./types";
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
  PlayerReconnect: "PlayerReconnect",
  Pong: "Pong",
} as const) satisfies Record<keyof ClientSocketData, unknown>;

export type ClientSocketEvent =
  (typeof ClientSocketEvent)[keyof typeof ClientSocketEvent];

export type ClientSocketData = DuplexSocketData &
  TargetSocketData & {
    AcceptConnection: { to: string };
    Connect: { to: string };
    DenyConnection: { to: string; reason: string };
    Disconnect: { to: string };
    Identify: DeviceInfo;
    PlayerReconnect: undefined | { to: string; payload: PlayerState };
    Pong: undefined;
  };
