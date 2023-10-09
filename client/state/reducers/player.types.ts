import { ObjectValues } from "@common/types";

export const MobileDisplayMode = {
  Fullscreen: "fullscreen",
  Minimized: "minimized",
  None: "none",
} as const;

export type MobileDisplayMode = ObjectValues<typeof MobileDisplayMode>;

export const PlayMode = {
  Static: "static",
  Random: "random",
  Playlist: "playlist",
} as const;

export type PlayMode = ObjectValues<typeof PlayMode>;

type StaticPlayOptions = {
  mode: typeof PlayMode.Static;
  complete: true;
};

type RandomPlayOptions = {
  mode: typeof PlayMode.Random;
  complete: boolean;
};

type PlaylistPlayOptions = {
  mode: typeof PlayMode.Playlist;
  id: string;
  page: number;
  limit: number;
  complete: boolean;
};

export type PlayOptions =
  | StaticPlayOptions
  | RandomPlayOptions
  | PlaylistPlayOptions;
