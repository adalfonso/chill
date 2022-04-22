import "./MediaViewer.scss";
import * as React from "react";
import { ArtistView } from "./Artist/ArtistView";
import { MusicLibrary } from "./MusicLibrary";
import { Route, Switch } from "react-router-dom";

export const MediaViewer = () => {
  return (
    <div id="media-viewer">
      <Switch>
        <Route path="/artist/:artist">
          <ArtistView></ArtistView>
        </Route>

        <Route path="/">
          <MusicLibrary />
        </Route>
      </Switch>
    </div>
  );
};
