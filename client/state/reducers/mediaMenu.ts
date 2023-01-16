import { Nullable } from "@common/types";
import { createSlice } from "@reduxjs/toolkit";

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
    setMenu: (state, action) => {
      state.menu_id = action.payload.menu_id;
    },
  },
});

export const { setMenu } = mediaMenuSlice.actions;

export default mediaMenuSlice.reducer;
