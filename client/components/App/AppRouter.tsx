import { useContext, useEffect } from "preact/hooks";
import { useDispatch } from "react-redux";
import { Switch, Route } from "wouter-preact";

import "./MediaViewer.scss";
import { AlbumView } from "./MediaViewer/AlbumView";
import { AppContext } from "@client/state/AppState";
import { ArtistView } from "./MediaViewer/ArtistView";
import { GenreView } from "./MediaViewer/GenreView";
import { MusicLibrary } from "./MediaViewer/MusicLibrary";
import { PlaylistViewer } from "./MediaViewer/PlaylistViewer";
import { Playlists } from "./MediaViewer/Playlists";
import { api } from "@client/client";
import { setUser } from "@reducers/user";

export const AppRouter = () => {
  const { is_busy } = useContext(AppContext);
  const dispatch = useDispatch();

  // Let's load the user once and expect that any updates to the user through
  // the UI will return updated user bits that we will merge into the state
  useEffect(() => {
    api.user.get.query().then((user) => dispatch(setUser(user)));
  }, []);

  return (
    <>
      {is_busy.value === true && <div className="loading"></div>}

      <Switch>
        <Route path="/artist/:artist_id">
          {({ artist_id }) => <ArtistView artist_id={parseInt(artist_id)} />}
        </Route>
        <Route path="/artist/:artist_id/album/:album_id">
          {({ artist_id, album_id }) => (
            <AlbumView
              artist_id={artist_id ? parseInt(artist_id) : undefined}
              album_id={parseInt(album_id)}
            />
          )}
        </Route>
        <Route path="/album/:album_id">
          {({ album_id }) => <AlbumView album_id={parseInt(album_id)} />}
        </Route>
        <Route path="/genre/:genre_id">
          {({ genre_id }) => <GenreView genre_id={parseInt(genre_id)} />}
        </Route>
        <Route path="/playlists" component={Playlists} />
        <Route path="/playlist/:playlist_id">
          {({ playlist_id }) => (
            <PlaylistViewer playlist_id={parseInt(playlist_id)} />
          )}
        </Route>
        <Route path="/" component={MusicLibrary} />
      </Switch>
    </>
  );
};
