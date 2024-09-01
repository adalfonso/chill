import { Maybe } from "@common/types";
import { createSlice, PayloadAction as Action } from "@reduxjs/toolkit";

type CastState = {
  app_id: Maybe<string>;
  ready: boolean;
};

const initialState: CastState = {
  app_id: null,
  ready: false,
};

export const casterSlice = createSlice({
  name: "caster",
  initialState,
  reducers: {
    setCastAppId: (state, action: Action<Maybe<string>>) => {
      const id = action.payload;

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
