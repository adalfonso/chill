import { createSlice, PayloadAction as Action } from "@reduxjs/toolkit";

import { PlayableTrack } from "@common/types";

type PlaylistEditorState = {
  active: boolean;
  track_ids: Array<PlayableTrack>;
};

const initialState: PlaylistEditorState = {
  active: false,
  track_ids: [],
};

export const playlistEditorSlice = createSlice({
  name: "playlist_editor",
  initialState,
  reducers: {
    toggle: (state, action: Action<{ track_ids: Array<PlayableTrack> }>) => {
      const { track_ids: track_ids = [] } = action.payload ?? {};

      state.active = !state.active;
      state.track_ids = state.active ? track_ids : [];
    },
  },
});

export const { toggle } = playlistEditorSlice.actions;

export default playlistEditorSlice.reducer;
