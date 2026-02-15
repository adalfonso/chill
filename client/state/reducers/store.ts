import { configureStore } from "@reduxjs/toolkit";

import player from "./player";

const store = configureStore({
  reducer: {
    player,
  },
});

type RootState = ReturnType<typeof store.getState>;

export const getPlayerState = (state: RootState) => state.player;

export default store;
