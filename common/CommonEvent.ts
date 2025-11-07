import { PlayableTrack, PlayPayload } from "./types";

export const DuplexEvent = {
  PlayerNext: "PlayerNext",
  PlayerPause: "PlayerPause",
  PlayerPlay: "PlayerPlay",
  PlayerPlayNext: "PlayerPlayNext",
  PlayerPrevious: "PlayerPrevious",
} as const satisfies Record<keyof DuplexSocketData, unknown>;

export type DuplexEvent = (typeof DuplexEvent)[keyof typeof DuplexEvent];

export type DuplexSocketData = {
  PlayerNext: { payload: { auto?: boolean }; sender: SenderType };
  PlayerPause: { sender: SenderType };
  PlayerPlay: { payload: PlayPayload; sender: SenderType };
  PlayerPlayNext: { payload: Array<PlayableTrack>; sender: SenderType };
  PlayerPrevious: { sender: SenderType };
};

export const TargetEvent = {
  PlayerProgressUpdate: "PlayerProgressUpdate",
} as const satisfies Record<keyof TargetSocketData, unknown>;

export type TargetEvent = (typeof TargetEvent)[keyof typeof TargetEvent];

export type TargetSocketData = {
  PlayerProgressUpdate: number;
};

export const SenderType = {
  Source: "Source",
  Target: "Target",
} as const;

type SenderType = (typeof SenderType)[keyof typeof SenderType];
