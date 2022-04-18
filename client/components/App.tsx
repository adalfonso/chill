import "./../assets/scss/app.scss";
import "./App.scss";
import * as React from "react";
import { Libraries } from "./Libraries/Libraries";
import { MediaViewer } from "./MediaViewer/MediaViewer";
import { Toolbar } from "./Toolbar/Toolbar";
import { hot } from "react-hot-loader/root";

export function App() {
  return (
    <div className="app">
      <Toolbar />
      <Libraries />
      <MediaViewer />
    </div>
  );
}

export default hot(App);
