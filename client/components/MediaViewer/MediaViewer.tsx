import "./MediaViewer.scss";
import React, { useState } from "react";
import { AlbumView } from "./Album/AlbumView";
import { ArtistView } from "./Artist/ArtistView";
import { GenreView } from "./Genre/GenreView";
import { Media } from "@common/autogen";
import { MusicLibrary } from "./MusicLibrary";
import { RootState } from "@client/state/reducers/store";
import { Route, Switch } from "react-router-dom";
import { play } from "@client/state/reducers/playerReducer";
import { useDispatch, useSelector } from "react-redux";

export const MediaViewer = () => {
  const [loading, setLoading] = useState(false);
  const player = useSelector<RootState>((state) => state.player);
  const dispatch = useDispatch();

  const onPlay = (files: Media[], index = 0) => {
    dispatch(play({ files: [...files], index }));
  };

  return (
    <>
      {loading && <div className="loading"></div>}
      <Switch>
        <Route path="/artist/:artist">
          <ArtistView onPlay={onPlay} setLoading={setLoading} />
        </Route>

        <Route path="/album/:album">
          <AlbumView
            onPlay={onPlay}
            setLoading={setLoading}
            now_playing={player.now_playing}
          />
        </Route>

        <Route path="/genre/:genre">
          <GenreView onPlay={onPlay} setLoading={setLoading} />
        </Route>

        <Route path="/">
          <MusicLibrary onPlay={onPlay} setLoading={setLoading} per_page={25} />
        </Route>
      </Switch>
    </>
  );
};
