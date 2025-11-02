export const ServerSocketEvent = {
  AcceptConnection: "AcceptConnection",
  DenyConnection: "DenyConnection",
  Pong: "Pong",
  RequestConnection: "RequestConnection",
  Disconnect: "Disconnect",
} as const;

export type ServerSocketEvent =
  (typeof ServerSocketEvent)[keyof typeof ServerSocketEvent];

const EnforcableServerSocketData = {
  AcceptConnection: {
    from: "connection-target-id",
  },
  DenyConnection: { from: "Server", reason: "Deny reason" },
  Pong: undefined,
  RequestConnection: { from: "connection-source-id" },
  Disconnect: { from: "connection-source-id" },
} satisfies Record<ServerSocketEvent, unknown>;

export type ServerSocketData = typeof EnforcableServerSocketData;
