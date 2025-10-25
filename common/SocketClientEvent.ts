export const ClientSocketEvent = {
  Ping: "Ping",
} as const;

export type ClientSocketEvent =
  (typeof ClientSocketEvent)[keyof typeof ClientSocketEvent];

const EnforcableClientSocketData = {
  Ping: undefined,
} satisfies Record<ClientSocketEvent, unknown>;

export type ClientSocketData = typeof EnforcableClientSocketData;
