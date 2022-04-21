import "regenerator-runtime";
import * as React from "react";
import App from "./components/App";
import { BrowserRouter } from "react-router-dom";
import { render } from "react-dom";

const rootEl = document.getElementById("root");

render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  rootEl,
);
