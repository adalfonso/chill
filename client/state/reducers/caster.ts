import { Nullable } from "@common/types";
import { createSlice } from "@reduxjs/toolkit";

export type CastState = {
  app_id: Nullable<string>;
  current_track_progress: number;
  ready: boolean;
};

const initialState: CastState = {
  app_id: null,
  current_track_progress: 0,
  ready: false,
};

export const casterSlice = createSlice({
  name: "caster",
  initialState,
  reducers: {
    setCastAppId: (state, action) => {
      const { id } = action.payload;

      if (!id || id === state.app_id) {
        return;
      }

      state.app_id = id;

      // TODO: Gracefully handle this situation
      if (!window.__chill_app.cast_ready) {
        console.error(
          "Tried to initialize caster but the SDK hasn't loaded yet",
        );

        return;
      }

      state.ready = true;
    },
  },
});

export const { setCastAppId } = casterSlice.actions;

export default casterSlice.reducer;
