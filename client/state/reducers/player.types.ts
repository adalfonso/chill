import { ObjectValues } from "@common/types";

export const MobileDisplayMode = {
  Fullscreen: "fullscreen",
  Minimized: "minimized",
  None: "none",
} as const;

export type MobileDisplayMode = ObjectValues<typeof MobileDisplayMode>;

export const PlayMode = {
  None: "none",
  Random: "random",
  UserPlaylist: "user-playlist",
  Artist: "artist",
  Album: "album",
  Genre: "genre",
} as const;

export type PlayMode = ObjectValues<typeof PlayMode>;

type RandomPlayOptions = {
  mode: typeof PlayMode.Random;
  more: boolean;
};

type NonePlayOptions = {
  mode: typeof PlayMode.None;
  more: false;
};

export type PlayOptions =
  | RandomPlayOptions
  | NonePlayOptions
  | {
      mode: Exclude<PlayMode, typeof PlayMode.Random & typeof PlayMode.None>;
      id: number;
      page: number;
      limit: number;
      more: boolean;
    };
