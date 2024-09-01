import { Provider } from "react-redux";
import { render } from "preact";

import store from "@reducers/store";
import { App } from "./App";
import { AppContext, createAppState } from "./state/AppState";

const element = document.getElementById("root");

if (element === null) {
  throw new Error('Could not locate "root" element');
}

window.__chill_app = {
  cast_ready: false,
};

render(
  <AppContext.Provider value={createAppState()}>
    <Provider store={store}>
      <App />
    </Provider>
  </AppContext.Provider>,
  element,
);

window["__onGCastApiAvailable"] = (isAvailable) => {
  if (!isAvailable) {
    return;
  }

  window.__chill_app.cast_ready = true;
};
