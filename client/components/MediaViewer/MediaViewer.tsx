import "./MediaViewer.scss";
import * as React from "react";
import { AlbumView } from "./Album/AlbumView";
import { ArtistView } from "./Artist/ArtistView";
import { GenreView } from "./Genre/GenreView";
import { MusicLibrary } from "./MusicLibrary";
import { Route, Switch } from "react-router-dom";

export const MediaViewer = () => {
  return (
    <div id="media-viewer">
      <Switch>
        <Route path="/artist/:artist">
          <ArtistView></ArtistView>
        </Route>

        <Route path="/album/:album">
          <AlbumView></AlbumView>
        </Route>

        <Route path="/genre/:genre">
          <GenreView></GenreView>
        </Route>

        <Route path="/">
          <MusicLibrary />
        </Route>
      </Switch>
    </div>
  );
};
