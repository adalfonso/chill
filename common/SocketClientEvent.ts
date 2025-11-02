export const ClientSocketEvent = {
  DenyConnection: "DenyConnection",
  Identify: "Identify",
  Ping: "Ping",
  RequestConnection: "RequestConnection",
  AcceptConnection: "AcceptConnection",
  Disconnect: "Disconnect",
} as const;

export type ClientSocketEvent =
  (typeof ClientSocketEvent)[keyof typeof ClientSocketEvent];

const EnforcableClientSocketData = {
  Identify: { type: "Desktop", browser: "Chrome", os: "Linux" },
  Ping: undefined,
  RequestConnection: { to: "connection-target-id" },
  AcceptConnection: { to: "connection-target-id" },
  DenyConnection: {
    to: "connection-target-id",
    reason: "already connected to another device",
  },
  Disconnect: { to: "connection-source-id" },
} satisfies Record<ClientSocketEvent, unknown>;

export type ClientSocketData = typeof EnforcableClientSocketData;
