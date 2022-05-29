import "regenerator-runtime";
import App from "./components/App";
import React from "react";
import store from "./state/reducers/store";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { render } from "react-dom";

const rootEl = document.getElementById("root");

render(
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>,
  rootEl,
);
