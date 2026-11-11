import { render } from "preact";

import { App } from "./App";
import { AppContext, getAppState } from "./state/AppState";
import { startNativeCommands } from "./lib/native/handleNativeCommands";
import { startNativeSync } from "./lib/native/syncPlayerToNative";

const element = document.getElementById("root");

if (element === null) {
  throw new Error('Could not locate "root" element');
}

window.__chill_app = {
  cast_ready: false,
};

// Mirror the player into Android Auto and accept car commands. Both do
// nothing outside the native shell, so the web build is unaffected.
startNativeSync();
startNativeCommands();

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
