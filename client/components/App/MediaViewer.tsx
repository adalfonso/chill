import "./MediaViewer.scss";
import { useState } from "react";
import { AlbumView } from "./MediaViewer/AlbumView";
import { ArtistView } from "./MediaViewer/ArtistView";
import { GenreView } from "./MediaViewer/GenreView";
import { MusicLibrary } from "./MediaViewer/MusicLibrary";
import { Playlist } from "./MediaViewer/Playlist";
import { Playlists } from "./MediaViewer/Playlists";
import { Route, Switch } from "react-router-dom";

export const MediaViewer = () => {
  const [loading, setLoading] = useState(false);

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
