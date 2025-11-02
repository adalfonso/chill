import {
  EnforcableSharedSocketData,
  SharedSocketEvent,
} from "./SharedSocketEvent";

export const ServerSocketEvent = Object.assign({}, SharedSocketEvent, {
  Pong: "Pong",
} as const);

export type ServerSocketEvent =
  (typeof ServerSocketEvent)[keyof typeof ServerSocketEvent];

const EnforcableServerSocketData = Object.assign(
  {},
  EnforcableSharedSocketData,
  {
    Pong: undefined,
  },
) satisfies Record<ServerSocketEvent, unknown>;

export type ServerSocketData = typeof EnforcableServerSocketData;
