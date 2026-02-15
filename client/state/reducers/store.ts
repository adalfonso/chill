import { configureStore } from "@reduxjs/toolkit";

import player from "./player";
import user from "./user";

const store = configureStore({
  reducer: {
    player,
    user,
  },
});

type RootState = ReturnType<typeof store.getState>;

export const getPlayerState = (state: RootState) => state.player;
export const getUserState = (state: RootState) => state.user;

export default store;
