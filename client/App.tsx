import "./App.scss";
import { MediaViewer } from "./components/App/MediaViewer";
import { PlayControls } from "./components/App/PlayControls";
import { PlaylistEditor } from "./components/App/PlaylistEditor";
import { Toolbar } from "./components/App/Toolbar";
import { client } from "./client";
import { getState } from "@reducers/store";
import { setCastAppId } from "./state/reducers/caster";
import { setMenu } from "@reducers/mediaMenu";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";

export const App = () => {
  const dispatch = useDispatch();
  const clearActiveFileMenu = () => dispatch(setMenu(null));
  const { playlistEditor, player } = useSelector(getState);

  useEffect(() => {
    client.app.getCastId.query().then((id) => dispatch(setCastAppId(id)));
  }, []);

  return (
    <div className="app" onClick={clearActiveFileMenu}>
      <Toolbar />
      <MediaViewer />
      {player.playlist?.length > 0 && <PlayControls />}
      {playlistEditor.active && <PlaylistEditor />}
    </div>
  );
};
