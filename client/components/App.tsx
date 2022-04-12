import "./../assets/scss/app.scss";
import "./App.scss";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import { Toolbar } from "./Toolbar/Toolbar";
import { Libraries } from "./Libraries/Libraries";
import { MediaViewer } from "./MediaViewer/MediaViewer";

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
