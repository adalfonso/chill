export const ClientSocketEvent = {
  AcceptConnection: "AcceptConnection",
  DenyConnection: "DenyConnection",
  Disconnect: "Disconnect",
  Identify: "Identify",
  Ping: "Ping",
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
  RequestConnection: { to: string };
};
