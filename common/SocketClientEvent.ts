export const ClientSocketEvent = {
  Identify: "Identify",
  Ping: "Ping",
} as const;

export type ClientSocketEvent =
  (typeof ClientSocketEvent)[keyof typeof ClientSocketEvent];

const EnforcableClientSocketData = {
  Identify: { type: "Desktop", browser: "Chrome", os: "Linux" },
  Ping: undefined,
} satisfies Record<ClientSocketEvent, unknown>;

export type ClientSocketData = typeof EnforcableClientSocketData;
