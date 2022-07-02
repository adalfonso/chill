import mediaMenu from "./mediaMenu";
import player from "./player";
import playlistEditor from "./playlistEditor";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    player,
    mediaMenu,
    playlistEditor,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export const getState = (state: RootState) => state;

export default store;
