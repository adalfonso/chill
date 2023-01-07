import "./App.scss";
import { MediaViewer } from "./components/App/MediaViewer";
import { PlayControls } from "./components/App/PlayControls";
import { PlaylistEditor } from "./components/App/PlaylistEditor";
import { Toolbar } from "./components/App/Toolbar";
import { getState } from "@reducers/store";
import { setMenu } from "@reducers/mediaMenu";
import { useDispatch, useSelector } from "react-redux";

export const App = () => {
  const dispatch = useDispatch();
  const clearActiveFileMenu = () => dispatch(setMenu({ menu_id: null }));
  const { playlistEditor } = useSelector(getState);

  return (
    <div className="app" onClick={clearActiveFileMenu}>
      <Toolbar />
      <MediaViewer />
      <PlayControls />
      {playlistEditor.active && <PlaylistEditor />}
    </div>
  );
};
