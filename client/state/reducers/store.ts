import mediaMenu from "./mediaMenu";
import player from "./player";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    player,
    mediaMenu,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
