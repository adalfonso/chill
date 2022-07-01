import "./App.scss";
import React from "react";
import { MediaViewer } from "./MediaViewer/MediaViewer";
import { PlayControls } from "./PlayControls/PlayControls";
import { Toolbar } from "./Toolbar/Toolbar";
import { hot } from "react-hot-loader/root";
import { useDispatch } from "react-redux";
import { setMenu } from "@reducers/mediaMenuReducer";

export function App() {
  const dispatch = useDispatch();
  const clearActiveFileMenu = () => dispatch(setMenu({ menu_id: null }));

  return (
    <div className="app" onClick={clearActiveFileMenu}>
      <Toolbar />
      <MediaViewer />
      <PlayControls></PlayControls>
    </div>
  );
}

export default hot(App);
