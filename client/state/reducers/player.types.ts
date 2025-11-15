import { ObjectValues } from "@common/types";

export const MobileDisplayMode = {
  Fullscreen: "fullscreen",
  Minimized: "minimized",
  None: "none",
} as const;

export type MobileDisplayMode = ObjectValues<typeof MobileDisplayMode>;
