import "./App.scss";
import React from "react";
import { MediaViewer } from "./App/MediaViewer";
import { PlayControls } from "./App/PlayControls";
import { PlaylistEditor } from "./App/PlaylistEditor";
import { RootState } from "@reducers/store";
import { Toolbar } from "./App/Toolbar";
import { hot } from "react-hot-loader/root";
import { setMenu } from "@reducers/mediaMenu";
import { useDispatch, useSelector } from "react-redux";

export function App() {
  const dispatch = useDispatch();
  const clearActiveFileMenu = () => dispatch(setMenu({ menu_id: null }));
  const { playlistEditor } = useSelector((state: RootState) => state);

  return (
    <div className="app" onClick={clearActiveFileMenu}>
      <Toolbar />
      <MediaViewer />
      <PlayControls />
      {playlistEditor.active && <PlaylistEditor />}
    </div>
  );
}

export default hot(App);
