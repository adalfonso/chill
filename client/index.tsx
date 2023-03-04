import store from "@reducers/store";
import { App } from "./App";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { createRoot } from "react-dom/client";

const element = document.getElementById("root");

if (element === null) {
  throw new Error('Could not locate "root" element');
}

const root = createRoot(element);

window.__chill_app = {
  cast_ready: false,
};

root.render(
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>,
);

window["__onGCastApiAvailable"] = (isAvailable) => {
  if (!isAvailable) {
    return;
  }

  window.__chill_app.cast_ready = true;
};
