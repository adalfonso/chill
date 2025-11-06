import { PlayPayload } from "./types";

export const SharedEvent = {
  PlayerPause: "PlayerPause",
  PlayerPlay: "PlayerPlay",
} as const satisfies Record<keyof SharedSocketData, unknown>;

export type SharedEvent = (typeof SharedEvent)[keyof typeof SharedEvent];

export type SharedSocketData = {
  PlayerPause: undefined;
  PlayerPlay: PlayPayload;
};

export const TargetEvent = {
  PlayerProgressUpdate: "PlayerProgressUpdate",
  PlayerSync: "PlayerSync",
} as const satisfies Record<keyof TargetSocketData, unknown>;

export type TargetEvent = (typeof TargetEvent)[keyof typeof TargetEvent];

export type TargetSocketData = {
  PlayerProgressUpdate: number;
  PlayerSync: PlayPayload;
};
