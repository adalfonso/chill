import { PlayableTrack, PlayableTrackWithIndex, PlayPayload } from "./types";

export const DuplexEvent = {
  PlayerAddToQueue: "PlayerAddToQueue",
  PlayerNext: "PlayerNext",
  PlayerPause: "PlayerPause",
  PlayerPlay: "PlayerPlay",
  PlayerPlayNext: "PlayerPlayNext",
  PlayerPrevious: "PlayerPrevious",
  PlayerShuffle: "PlayerShuffle",
} as const satisfies Record<keyof DuplexSocketData, unknown>;

export type DuplexEvent = (typeof DuplexEvent)[keyof typeof DuplexEvent];

export type DuplexSocketData = {
  PlayerAddToQueue: { payload: Array<PlayableTrack>; sender: SenderType };
  PlayerNext: { payload: { auto?: boolean }; sender: SenderType };
  PlayerPause: { sender: SenderType };
  PlayerPlay: { payload: PlayPayload; sender: SenderType };
  PlayerPlayNext: { payload: Array<PlayableTrack>; sender: SenderType };
  PlayerPrevious: { sender: SenderType };
  PlayerShuffle: { payload: Array<PlayableTrackWithIndex>; sender: SenderType };
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
