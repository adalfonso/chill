import "./App.scss";
import * as React from "react";
import { Media } from "@common/autogen";
import { MediaViewer } from "./MediaViewer/MediaViewer";
import { PlayControls } from "./PlayControls/PlayControls";
import { Player } from "@client/Player";
import { Playlist } from "@client/Playlist";
import { Toolbar } from "./Toolbar/Toolbar";
import { hot } from "react-hot-loader/root";
import { useState } from "react";

export function App() {
  const [player, setPlayer] = useState(Player.instance());
  const [playlist, setPlaylist] = useState(new Playlist([], 0));
  // This is used to force a re-render on the player controls
  const [lastPlayed, setLastPlayed] = useState(Date.now());

  const onPlay = async (files: Media[], index = 0) => {
    const playlist = new Playlist(files, index);
    setPlaylist(playlist);
    await player.setPlaylist(playlist);
    setLastPlayed(Date.now());
  };

  return (
    <div className="app">
      <Toolbar onPlay={onPlay} />
      <MediaViewer onPlay={onPlay} />
      <PlayControls player={player} playlist={playlist}></PlayControls>
    </div>
  );
}

export default hot(App);
