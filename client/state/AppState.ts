import { signal } from "@preact/signals-react";
import { createContext } from "react";

const is_busy = signal(false);
const app_state = { is_busy };

export const AppContext = createContext(app_state);
