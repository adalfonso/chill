import { PlayPayload } from "./types";

export const ClientSocketEvent = {
  AcceptConnection: "AcceptConnection",
  DenyConnection: "DenyConnection",
  Disconnect: "Disconnect",
  Identify: "Identify",
  Ping: "Ping",
  PlayerPause: "PlayerPause",
  PlayerPlay: "PlayerPlay",
  PlayerSync: "PlayerSync",
  PlayerProgressUpdate: "PlayerProgressUpdate",
  RequestConnection: "RequestConnection",
} as const satisfies Record<keyof ClientSocketData, unknown>;

export type ClientSocketEvent =
  (typeof ClientSocketEvent)[keyof typeof ClientSocketEvent];

export type ClientSocketData = {
  AcceptConnection: { to: string };
  DenyConnection: { to: string; reason: string };
  Disconnect: { to: string };
  Identify: { type: string; browser: string; os: string };
  Ping: undefined;
  PlayerPause: undefined;
  PlayerPlay: PlayPayload;
  PlayerSync: PlayPayload;
  PlayerProgressUpdate: number;
  RequestConnection: { to: string };
};
