import "./PlayControls.scss";
import * as React from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Player } from "@client/Player";
import { Playlist } from "@client/Playlist";
import {
  faPlay,
  faPause,
  faFastForward,
  faFastBackward,
} from "@fortawesome/free-solid-svg-icons";

const audio = document.createElement("audio");

export const PlayControls = () => {
  const [playlist, setPlaylist] = React.useState(new Playlist());
  const [player, setPlayer] = React.useState(Player.instance());

  return (
    <div id="play-controls">
      <div className="scrub"></div>
      <div className="now-playing">Placeholder</div>
      <div className="controls">
        <div className="circle-button">
          <Icon icon={faFastBackward} size="sm" />
        </div>
        <div className="circle-button play">
          {player.is_playing ? (
            <Icon icon={faPause} size="lg" />
          ) : (
            <Icon icon={faPlay} size="lg" />
          )}
        </div>
        <div className="circle-button">
          <Icon icon={faFastForward} size="sm" />
        </div>
      </div>
    </div>
  );
};
