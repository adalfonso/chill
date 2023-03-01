import { Nullable } from "@common/types";
import { createSlice } from "@reduxjs/toolkit";

export type AppState = {
  cast_id: Nullable<string>;
};

const initialState: AppState = { cast_id: null };

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setCastId: (state, action) => {
      const { id } = action.payload;

      state.cast_id = id;
    },
  },
});

export const { setCastId } = appSlice.actions;

export default appSlice.reducer;
