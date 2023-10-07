import "./MediaViewer.scss";
import { AlbumView } from "./MediaViewer/AlbumView";
import { ArtistView } from "./MediaViewer/ArtistView";
import { GenreView } from "./MediaViewer/GenreView";
import { MusicLibrary } from "./MediaViewer/MusicLibrary";
import { PlaylistViewer } from "./MediaViewer/PlaylistViewer";
import { Playlists } from "./MediaViewer/Playlists";
import { Route, Routes } from "react-router-dom";
import { UserApi } from "@client/api/UserApi";
import { setUser } from "@reducers/user";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";

export const AppRouter = () => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  // Let's load the user once and expect that any updates to the user through
  // the UI will return updated user bits that we will merge into the state
  useEffect(() => {
    UserApi.get().then((user) => dispatch(setUser(user)));
  }, []);

  return (
    <>
      {loading && <div className="loading"></div>}

      <Routes>
        <Route
          path="/artist/:artist"
          element={<ArtistView setLoading={setLoading} />}
        ></Route>

        <Route
          path="/album/:album"
          element={<AlbumView setLoading={setLoading} />}
        ></Route>

        <Route
          path="/genre/:genre"
          element={<GenreView setLoading={setLoading} />}
        ></Route>

        <Route
          path="/playlists"
          element={<Playlists setLoading={setLoading} per_page={24} />}
        ></Route>

        <Route path="/playlist/:id" element={<PlaylistViewer />}></Route>

        <Route
          path="/"
          element={<MusicLibrary setLoading={setLoading} per_page={24} />}
        >
          {/* 24 is the magic number to have good UI for 3,4,6-column layout */}
        </Route>
      </Routes>
    </>
  );
};
