import { ObjectValues } from "@common/types";

export const AudioType = {
  mp3: "mp3",
  flac: "flac",
  alac: "alac",
  wma: "wma",
  m4a: "m4a",
  ogg: "ogg",
  wav: "wav",
  aac: "aac",
  ape: "ape",
} as const;

export type AudioType = ObjectValues<typeof AudioType>;
