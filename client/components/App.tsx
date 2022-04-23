import "./App.scss";
import * as React from "react";
import { Libraries } from "./Libraries/Libraries";
import { MediaViewer } from "./MediaViewer/MediaViewer";
import { Player } from "./Player/Player";
import { Toolbar } from "./Toolbar/Toolbar";
import { hot } from "react-hot-loader/root";

export function App() {
  return (
    <div className="app">
      <Toolbar />
      <Libraries />
      <MediaViewer />
      <Player></Player>
    </div>
  );
}

export default hot(App);
