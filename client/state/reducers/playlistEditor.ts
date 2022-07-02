import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Media } from "@common/autogen";

export interface PlaylistEditorState {
  active: boolean;
  files: Media[];
}

const initialState: PlaylistEditorState = {
  active: false,
  files: [],
};

export const playlistEditorSlice = createSlice({
  name: "playlist_editor",
  initialState,
  reducers: {
    toggle: (state, action: PayloadAction<{ files: Media[] }>) => {
      const { files = [] } = action.payload ?? {};

      state.active = !state.active;
      state.files = state.active ? files : [];
    },
  },
});

export const { toggle } = playlistEditorSlice.actions;

export default playlistEditorSlice.reducer;
