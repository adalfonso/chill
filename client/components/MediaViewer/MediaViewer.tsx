import "./MediaViewer.scss";
import * as React from "react";
import { MusicLibrary } from "./MusicLibrary";
import { Route, Switch } from "react-router-dom";

export const MediaViewer = () => {
  return (
    <Switch>
      <Route path="/artist/:artist">foo</Route>

      <Route path="/">
        <MusicLibrary />
      </Route>
    </Switch>
  );
};
