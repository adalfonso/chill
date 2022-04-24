import "./MediaViewer.scss";
import * as React from "react";
import { AlbumView } from "./Album/AlbumView";
import { ArtistView } from "./Artist/ArtistView";
import { GenreView } from "./Genre/GenreView";
import { Media } from "@common/autogen";
import { MusicLibrary } from "./MusicLibrary";
import { Route, Switch } from "react-router-dom";

interface MediaViewerProps {
  onPlay: (files: Media[]) => Promise<void>;
}

export const MediaViewer = ({ onPlay }: MediaViewerProps) => {
  return (
    <div id="media-viewer">
      <Switch>
        <Route path="/artist/:artist">
          <ArtistView onPlay={onPlay} />
        </Route>

        <Route path="/album/:album">
          <AlbumView onPlay={onPlay} />
        </Route>

        <Route path="/genre/:genre">
          <GenreView onPlay={onPlay} />
        </Route>

        <Route path="/">
          <MusicLibrary onPlay={onPlay} />
        </Route>
      </Switch>
    </div>
  );
};
