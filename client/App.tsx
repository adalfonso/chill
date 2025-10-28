import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "preact/hooks";

import "./App.scss";
import { AppRouter } from "./components/App/AppRouter";
import { PlayControls } from "./components/App/PlayControls";
import { PlayModeIterceptor } from "./components/App/PlayModeIntercepter";
import { PlaylistEditor } from "./components/App/PlaylistEditor";
import { Toolbar } from "./components/App/Toolbar";
import { api } from "./client";
import { getPlayerState, getPlaylistEditorState } from "@reducers/store";
import { setCastAppId } from "./state/reducers/caster";
import { setMenu } from "@reducers/mediaMenu";

export const App = () => {
  const dispatch = useDispatch();
  const clearActiveFileMenu = () => dispatch(setMenu(null));
  const player = useSelector(getPlayerState);
  const playlistEditor = useSelector(getPlaylistEditorState);
  useEffect(() => {
    api.cast.getCastId.query().then((id) => dispatch(setCastAppId(id)));
  }, []);

  return (
    <div className="app" onClick={clearActiveFileMenu}>
      <Toolbar />

      <PlayModeIterceptor>
        <AppRouter />
      </PlayModeIterceptor>

      {player.playlist?.length > 0 && <PlayControls />}
      {playlistEditor.active && <PlaylistEditor />}
    </div>
  );
};
