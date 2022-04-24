import "./PlayControls.scss";
import * as React from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Player } from "@client/Player";
import {
  faPlay,
  faPause,
  faFastForward,
  faFastBackward,
} from "@fortawesome/free-solid-svg-icons";

interface PlayControlsProps {
  player: Player;
}

export const PlayControls = ({ player }: PlayControlsProps) => {
  const [is_playing, setIsPlaying] = React.useState(player.is_playing);

  // If the player is updated let's sync this value
  if (is_playing !== player.is_playing) {
    setIsPlaying(player.is_playing);
  }

  const togglePlayer = async () => {
    const operation = player.is_playing ? player.pause() : player.play();
    setIsPlaying(await operation);
  };

  return (
    <div id="play-controls">
      <div className="scrub"></div>
      <div className="now-playing">Placeholder</div>
      <div className="controls">
        <div className="circle-button">
          <Icon icon={faFastBackward} size="sm" />
        </div>
        <div className="circle-button play" onClick={togglePlayer}>
          {is_playing ? (
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
