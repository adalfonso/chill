import { effect } from "@preact/signals";

import "./MediaViewer.scss";
import { AppSettings } from "./Toolbar/AppSettings";
import { Library } from "./Library";
import { PlaylistViewer } from "./MediaViewer/PlaylistViewer";
import { Playlists } from "./MediaViewer/Playlists";
import { Route, Switch } from "wouter-preact";
import { Search } from "./Toolbar/Search";
import { api } from "@client/client";
import { setUser } from "@client/state/userStore";
import { useAppState } from "@hooks/index";

export const AppRouter = () => {
  const { is_loading } = useAppState();

  // Load the user once on mount. Updates to the user through the UI
  // will return updated user bits that we will merge into the state
  effect(() => {
    api.user.get.query().then(setUser);
  });

  return (
    <>
      {is_loading.value === true && <div className="loading"></div>}
      <Switch>
        {/* These routes are overridden by local state management */}
        {VirtualRoute("/", "/library")}
        {VirtualRoute("/library")}
        {VirtualRoute("/library/artists")}
        {VirtualRoute("/library/albums")}
        {VirtualRoute("/library/compilations")}
        {VirtualRoute("/library/splits")}
        {VirtualRoute("/library/tracks")}
        {VirtualRoute("/library/genres")}

        <Route path="/library/artist/:id">
          {({ id }) => <SyncViewPath value={`/library/artist/${id}`} />}
        </Route>

        <Route path="/library/album/:id">
          {({ id }) => <SyncViewPath value={`/library/album/${id}`} />}
        </Route>

        <Route path="/library/genre/:id">
          {({ id }) => <SyncViewPath value={`/library/genre/${id}`} />}
        </Route>

        <Route path="/library/artist/:artist_id/album/:album_id">
          {({ artist_id, album_id }) => (
            <SyncViewPath
              value={`/library/artist/${artist_id}/album/${album_id}`}
            />
          )}
        </Route>

        {/* These routes use the router unlike the ones above */}
        <Route>
          <SyncViewPath value="/router" />

          <div id="native-router">
            <Switch>
              <Route path="/playlists" component={Playlists} />

              <Route path="/playlist/:playlist_id">
                {({ playlist_id }) => (
                  <PlaylistViewer playlist_id={parseInt(playlist_id)} />
                )}
              </Route>
            </Switch>
          </div>
        </Route>
      </Switch>

      <div id="virtual-router">
        {/* These will automatically show/hide based on the className on #app */}
        <Library />
        <Search />
        <AppSettings />
      </div>
    </>
  );
};

const VirtualRoute = (url: string, syncUrl?: string) => (
  <Route path={url}>
    <SyncViewPath value={syncUrl ?? url} />
  </Route>
);

const SyncViewPath = ({ value }: { value: string }) => {
  const { view_path } = useAppState();

  if (view_path.value !== value) {
    view_path.value = value;
  }

  return null;
};
