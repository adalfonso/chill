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

const default_now_playing = "-";

export const PlayControls = ({ player }: PlayControlsProps) => {
  const [is_playing, setIsPlaying] = React.useState(player.is_playing);
  const [now_playing, setNowPlaying] = React.useState(default_now_playing);

  const getNowPlaying = () =>
    player.now_playing
      ? `${player.now_playing.artist} - ${player.now_playing.title}`
      : default_now_playing;

  /**
   * The next couple checks are necessary to sync operations on Player.ts with
   * the controls in this component as well as operations that take place in
   * other parts of the application
   */
  if (is_playing !== player.is_playing) {
    setIsPlaying(player.is_playing);
    setNowPlaying(getNowPlaying());
  }

  if (now_playing !== getNowPlaying()) {
    setNowPlaying(getNowPlaying());
  }

  const togglePlayer = async () => {
    const operation = player.is_playing ? player.pause() : player.play();
    setIsPlaying(await operation);
  };

  const previous = async () => {
    await player.previous();
    setNowPlaying(getNowPlaying());
  };

  const next = async () => {
    await player.next();
    setNowPlaying(getNowPlaying());
  };

  return (
    <div id="play-controls">
      <div className="scrub"></div>
      <div className="now-playing">{now_playing}</div>
      <div className="controls">
        <div className="circle-button" onClick={previous}>
          <Icon icon={faFastBackward} size="sm" />
        </div>
        <div className="circle-button play" onClick={togglePlayer}>
          {is_playing ? (
            <Icon icon={faPause} size="lg" />
          ) : (
            <Icon icon={faPlay} size="lg" />
          )}
        </div>
        <div className="circle-button" onClick={next}>
          <Icon icon={faFastForward} size="sm" />
        </div>
      </div>
    </div>
  );
};
