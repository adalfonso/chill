import "./MediaViewer.scss";
import { AlbumView } from "./MediaViewer/AlbumView";
import { ArtistView } from "./MediaViewer/ArtistView";
import { GenreView } from "./MediaViewer/GenreView";
import { MusicLibrary } from "./MediaViewer/MusicLibrary";
import { Playlist } from "./MediaViewer/Playlist";
import { Playlists } from "./MediaViewer/Playlists";
import { Route, Switch } from "react-router-dom";
import { UserApi } from "@client/api/UserApi";
import { setUser } from "@reducers/user";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";

export const MediaViewer = () => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  // Let's load the user once and expect that any updates to the user through
  // the UI will return updated user bits that we will merge into the state
  useEffect(() => {
    UserApi.get().then((res) => {
      dispatch(setUser({ user: res.data }));
    });
  }, []);

  return (
    <>
      {loading && <div className="loading"></div>}
      <Switch>
        <Route path="/artist/:artist">
          <ArtistView setLoading={setLoading} />
        </Route>

        <Route path="/album/:album">
          <AlbumView setLoading={setLoading} />
        </Route>

        <Route path="/genre/:genre">
          <GenreView setLoading={setLoading} />
        </Route>

        <Route path="/playlists">
          <Playlists setLoading={setLoading} per_page={24} />
        </Route>

        <Route path="/playlist/:id">
          <Playlist />
        </Route>

        <Route path="/">
          {/* 24 is the magic number to have good UI for 3,4,6-column layout */}
          <MusicLibrary setLoading={setLoading} per_page={24} />
        </Route>
      </Switch>
    </>
  );
};
