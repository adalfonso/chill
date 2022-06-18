import "./MediaViewer.scss";
import React, { useState } from "react";
import { AlbumView } from "./Album/AlbumView";
import { ArtistView } from "./Artist/ArtistView";
import { GenreView } from "./Genre/GenreView";
import { MusicLibrary } from "./MusicLibrary";
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

        <Route path="/">
          <MusicLibrary setLoading={setLoading} per_page={25} />
        </Route>
      </Switch>
    </>
  );
};
