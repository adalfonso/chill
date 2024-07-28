import { Route, Routes } from "react-router-dom";
import { useContext, useEffect } from "react";
import { useDispatch } from "react-redux";

import "./MediaViewer.scss";
import { AlbumView } from "./MediaViewer/AlbumView";
import { AppContext } from "@client/state/AppState";
import { ArtistView } from "./MediaViewer/ArtistView";
import { GenreView } from "./MediaViewer/GenreView";
import { MusicLibrary } from "./MediaViewer/MusicLibrary";
import { PlaylistViewer } from "./MediaViewer/PlaylistViewer";
import { Playlists } from "./MediaViewer/Playlists";
import { setUser } from "@reducers/user";
import { api } from "@client/client";

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

      <Routes>
        <Route path="/artist/:artist_id" element={<ArtistView />}></Route>

        <Route
          path="/artist/:artist_id/album/:album_id"
          element={<AlbumView />}
        ></Route>
        <Route path="/album/:album_id" element={<AlbumView />}></Route>

        <Route path="/genre/:genre_id" element={<GenreView />}></Route>

        <Route path="/playlists" element={<Playlists per_page={24} />}></Route>

        <Route path="/playlist/:id" element={<PlaylistViewer />}></Route>

        <Route path="/" element={<MusicLibrary />}></Route>
      </Routes>
    </>
  );
};
