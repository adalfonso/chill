import { Nullable } from "@common/types";
import { createSlice, PayloadAction as Action } from "@reduxjs/toolkit";

export interface MediaMenuState {
  menu_id: Nullable<string>;
}

const initialState: MediaMenuState = {
  menu_id: null,
};

export const mediaMenuSlice = createSlice({
  name: "media_menu",
  initialState,
  reducers: {
    setMenu: (state, action: Action<Nullable<string>>) => {
      state.menu_id = action.payload;
    },
  },
});

export const { setMenu } = mediaMenuSlice.actions;

export default mediaMenuSlice.reducer;
