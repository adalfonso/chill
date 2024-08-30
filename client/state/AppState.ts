import { createContext } from "preact";
import { signal } from "@preact/signals";

const is_busy = signal(false);
const app_state = { is_busy };

export const AppContext = createContext(app_state);
