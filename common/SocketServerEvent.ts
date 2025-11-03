import { PlayPayload } from "./types";

export const ServerSocketEvent = {
  AcceptConnection: "AcceptConnection",
  DenyConnection: "DenyConnection",
  Disconnect: "Disconnect",
  PlayerPause: "PlayerPause",
  PlayerPlay: "PlayerPlay",
  Pong: "Pong",
  Reconnect: "Reconnect",
  RequestConnection: "RequestConnection",
} as const satisfies Record<keyof ServerSocketData, string>;

export type ServerSocketEvent =
  (typeof ServerSocketEvent)[keyof typeof ServerSocketEvent];

export type ServerSocketData = {
  AcceptConnection: { from: string };
  DenyConnection: { from: string; reason: string };
  Disconnect: { from: string };
  PlayerPause: undefined;
  PlayerPlay: PlayPayload;
  Pong: undefined;
  RequestConnection: { from: string };
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
