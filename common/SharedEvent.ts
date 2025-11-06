import { PlayPayload } from "./types";

export const SharedEvent = {
  PlayerPause: "PlayerPause",
  PlayerPlay: "PlayerPlay",
  PlayerSync: "PlayerSync",
  PlayerProgressUpdate: "PlayerProgressUpdate",
} as const satisfies Record<keyof SharedSocketData, unknown>;

export type SharedEvent = (typeof SharedEvent)[keyof typeof SharedEvent];

export type SharedSocketData = {
  PlayerPause: undefined;
  PlayerPlay: PlayPayload;
  PlayerSync: PlayPayload;
  PlayerProgressUpdate: number;
};
