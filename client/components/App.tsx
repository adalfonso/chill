import "./App.scss";
import React from "react";
import { MediaViewer } from "./App/MediaViewer";
import { PlayControls } from "./App/PlayControls";
import { Toolbar } from "./App/Toolbar";
import { hot } from "react-hot-loader/root";
import { setMenu } from "@reducers/mediaMenu";
import { useDispatch } from "react-redux";
// import { PlaylistEditor } from "./App/PlaylistEditor";

export function App() {
  const dispatch = useDispatch();
  const clearActiveFileMenu = () => dispatch(setMenu({ menu_id: null }));

  return (
    <div className="app" onClick={clearActiveFileMenu}>
      <Toolbar />
      <MediaViewer />
      <PlayControls />
      {/* <PlaylistEditor /> */}
    </div>
  );
}

export default hot(App);
