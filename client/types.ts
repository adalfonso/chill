export const AppSettingType = {
  None: "None",
  Account: "Account",
  InviteUser: "InviteUser",
  LibraryInsights: "LibraryInsights",
  LibraryScan: "LibraryScan",
  MusicQuality: "MusicQuality",
  NameDevice: "NameDevice",
} as const;

export type AppSettingType =
  (typeof AppSettingType)[keyof typeof AppSettingType];
