import { Maybe } from "@common/types";
import { createSlice, PayloadAction as Action } from "@reduxjs/toolkit";

type MediaMenuState = {
  menu_id: Maybe<string>;
};

const initialState: MediaMenuState = {
  menu_id: null,
};

export const mediaMenuSlice = createSlice({
  name: "media_menu",
  initialState,
  reducers: {
    setMenu: (state, action: Action<Maybe<string>>) => {
      state.menu_id = action.payload;
    },
  },
});

export const { setMenu } = mediaMenuSlice.actions;

export default mediaMenuSlice.reducer;
