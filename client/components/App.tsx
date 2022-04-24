import "./App.scss";
import * as React from "react";
import { Libraries } from "./Libraries/Libraries";
import { MediaViewer } from "./MediaViewer/MediaViewer";
import { PlayControls } from "./PlayControls/PlayControls";
import { Player } from "@client/Player";
import { Toolbar } from "./Toolbar/Toolbar";
import { hot } from "react-hot-loader/root";
import { useState } from "react";
import { Playlist } from "@client/Playlist";
import { Media } from "@server/models/autogen";

export function App() {
  const [player, setPlayer] = useState(Player.instance());
  // This is used to force a re-render on the player controls
  const [lastPlayed, setLastPlayed] = useState(Date.now());

  const onPlay = async (files: Media[]) => {
    await player.setPlaylist(new Playlist(files));
    setLastPlayed(Date.now());
  };

  return (
    <div className="app">
      <Toolbar />
      <Libraries />
      <MediaViewer onPlay={onPlay} />
      <PlayControls player={player}></PlayControls>
    </div>
  );
}

export default hot(App);
