import { UserSettings } from "@prisma/client";
import { createSlice, PayloadAction as Action } from "@reduxjs/toolkit";

import { Maybe, UserType } from "@common/types";

export type UserState = {
  type: UserType;
  settings: Maybe<Pick<UserSettings, "audio_quality">>;
};

const initialState: UserState = { type: UserType.User, settings: null };

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: Action<UserState>) => {
      const { type, settings } = action.payload;

      state.type = type;
      state.settings = settings ?? null;
    },

    updateUserSettings: (state, action) => {
      const { settings } = action.payload;

      state.settings = { ...state.settings, ...(settings ?? {}) };
    },
  },
});

export const { setUser, updateUserSettings } = userSlice.actions;

export default userSlice.reducer;
