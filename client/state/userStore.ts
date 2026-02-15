import { signal } from "@preact/signals";
import { AudioQuality, Maybe, UserType } from "@common/types";

type UserSettings = { audio_quality: AudioQuality };

/** The current user's role (Admin or User). */
export const type = signal<UserType>(UserType.User);

/** The current user's persisted settings. */
export const settings = signal<Maybe<UserSettings>>(null);

/**
 * Initializes user state from the API response.
 *
 * @param user - The user data containing type and settings
 */
export const setUser = (user: {
  type: UserType;
  settings: Maybe<UserSettings>;
}) => {
  type.value = user.type;
  settings.value = user.settings ?? null;
};

/**
 * Merges updated settings into the current user settings.
 *
 * @param updated - The settings fields to merge
 */
export const updateUserSettings = (updated: Partial<UserSettings>) => {
  settings.value = { ...settings.value, ...updated } as UserSettings;
};
