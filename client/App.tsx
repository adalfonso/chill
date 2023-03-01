import "./App.scss";
import { MediaViewer } from "./components/App/MediaViewer";
import { PlayControls } from "./components/App/PlayControls";
import { PlaylistEditor } from "./components/App/PlaylistEditor";
import { Toolbar } from "./components/App/Toolbar";
import { client } from "./client";
import { getState } from "@reducers/store";
import { setCastId } from "./state/reducers/app";
import { setMenu } from "@reducers/mediaMenu";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { Cast } from "./lib/cast/Cast";

export const App = () => {
  const dispatch = useDispatch();
  const clearActiveFileMenu = () => dispatch(setMenu({ menu_id: null }));
  const { playlistEditor, app } = useSelector(getState);

  useEffect(() => {
    client.app.getCastId.query().then((id) => dispatch(setCastId({ id })));
  });

  useEffect(() => {
    if (app.cast_id === null) {
      return;
    }

    Cast.instance().app_id = app.cast_id;
  }, [app.cast_id]);

  return (
    <div className="app" onClick={clearActiveFileMenu}>
      <Toolbar />
      <MediaViewer />
      <PlayControls />
      {playlistEditor.active && <PlaylistEditor />}
    </div>
  );
};
