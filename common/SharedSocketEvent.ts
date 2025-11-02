export const SharedSocketEvent = {
  RequestConnection: "RequestConnection",
  AcceptConnection: "AcceptConnection",
  DenyConnection: "DenyConnection",
} as const;

export type SharedSocketEvent =
  (typeof SharedSocketEvent)[keyof typeof SharedSocketEvent];

export const EnforcableSharedSocketData = {
  AcceptConnection: undefined,
  DenyConnection: undefined,
  RequestConnection: "connecting-session-id",
} satisfies Record<SharedSocketEvent, unknown>;
