import { AppContext } from "@client/state/AppState";
import { useContext } from "preact/hooks";

export const useAppState = () => {
  return useContext(AppContext);
};
