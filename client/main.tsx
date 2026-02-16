import { render } from "preact";

import { App } from "./App";
import { AppContext, getAppState } from "./state/AppState";

const element = document.getElementById("root");

if (element === null) {
  throw new Error('Could not locate "root" element');
}

window.__chill_app = {
  cast_ready: false,
};

render(
  <AppContext.Provider value={getAppState()}>
    <App />
  </AppContext.Provider>,
  element,
);

window["__onGCastApiAvailable"] = (isAvailable) => {
  if (!isAvailable) {
    return;
  }

  window.__chill_app.cast_ready = true;
};
