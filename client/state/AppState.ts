import { createContext } from "preact";
import { signal } from "@preact/signals";

export const createAppState = () => {
  const is_busy = signal(false);
  const progress = signal<number>(0);

  return { is_busy, progress };
};

export const AppContext = createContext(createAppState());
