import { SharedEvent, SharedSocketData } from "./SharedEvent";
export const ClientSocketEvent = {
  ...SharedEvent,
  ...{
    AcceptConnection: "AcceptConnection",
    DenyConnection: "DenyConnection",
    Disconnect: "Disconnect",
    Identify: "Identify",
    Ping: "Ping",

    RequestConnection: "RequestConnection",
  },
} as const satisfies Record<keyof ClientSocketData, unknown>;

export type ClientSocketEvent =
  (typeof ClientSocketEvent)[keyof typeof ClientSocketEvent];

export type ClientSocketData = SharedSocketData & {
  AcceptConnection: { to: string };
  DenyConnection: { to: string; reason: string };
  Disconnect: { to: string };
  Identify: { type: string; browser: string; os: string };
  Ping: undefined;
  RequestConnection: { to: string };
};
