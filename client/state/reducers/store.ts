import mediaMenuReducer from "./mediaMenuReducer";
import playerReducer from "./playerReducer";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    player: playerReducer,
    mediaMenu: mediaMenuReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
