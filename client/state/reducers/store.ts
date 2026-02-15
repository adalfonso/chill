import { configureStore } from "@reduxjs/toolkit";

import player from "./player";
import playlistEditor from "./playlistEditor";
import user from "./user";

const store = configureStore({
  reducer: {
    player,
    playlistEditor,
    user,
  },
});

type RootState = ReturnType<typeof store.getState>;

export const getPlayerState = (state: RootState) => state.player;
export const getPlaylistEditorState = (state: RootState) =>
  state.playlistEditor;
export const getUserState = (state: RootState) => state.user;

export default store;
