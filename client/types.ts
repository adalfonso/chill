export const AppSettingType = {
  None: "None",
  MusicQuality: "MusicQuality",
  InviteUser: "InviteUser",
  LibraryScan: "LibraryScan",
  LibraryInsights: "LibraryInsights",
} as const;

export type AppSettingType =
  (typeof AppSettingType)[keyof typeof AppSettingType];
