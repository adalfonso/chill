export const ServerSocketEvent = {
  Pong: "Pong",
} as const;

export type ServerSocketEvent =
  (typeof ServerSocketEvent)[keyof typeof ServerSocketEvent];

const EnforcableServerSocketData = {
  Pong: undefined,
} satisfies Record<ServerSocketEvent, unknown>;

export type ServerSocketData = typeof EnforcableServerSocketData;
