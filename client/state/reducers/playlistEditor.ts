import { createSlice, PayloadAction as Action } from "@reduxjs/toolkit";

type PlaylistEditorState = {
  active: boolean;
  track_ids: Array<number>;
};

const initialState: PlaylistEditorState = {
  active: false,
  track_ids: [],
};

export const playlistEditorSlice = createSlice({
  name: "playlist_editor",
  initialState,
  reducers: {
    toggle: (state, action: Action<{ track_ids: Array<number> }>) => {
      const { track_ids: track_ids = [] } = action.payload ?? {};

      state.active = !state.active;
      state.track_ids = state.active ? track_ids : [];
    },
  },
});

export const { toggle } = playlistEditorSlice.actions;

export default playlistEditorSlice.reducer;
