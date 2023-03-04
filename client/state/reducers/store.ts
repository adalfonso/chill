import caster from "./caster";
import mediaMenu from "./mediaMenu";
import player from "./player";
import playlistEditor from "./playlistEditor";
import user from "./user";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    caster,
    mediaMenu,
    player,
    playlistEditor,
    user,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export const getState = (state: RootState) => state;

export default store;
