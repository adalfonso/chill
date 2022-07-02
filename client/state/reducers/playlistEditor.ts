import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Media } from "@common/autogen";

export interface PlaylistEditorState {
  active: boolean;
  items: Media[];
}

const initialState: PlaylistEditorState = {
  active: false,
  items: [],
};

export const playlistEditorSlice = createSlice({
  name: "playlist_editor",
  initialState,
  reducers: {
    toggle: (state, action: PayloadAction<{ items: Media[] }>) => {
      const { items = [] } = action.payload ?? {};

      state.active = !state.active;
      state.items = state.active ? items : [];
    },
  },
});

export const { toggle } = playlistEditorSlice.actions;

export default playlistEditorSlice.reducer;
