import "./Player.scss";
import * as React from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faPause,
  faFastForward,
  faFastBackward,
} from "@fortawesome/free-solid-svg-icons";

export const Player = () => {
  const [is_playing, setIsPlayer] = React.useState(false);

  return (
    <div id="player">
      <div className="scrub"></div>
      <div className="now-playing">Placeholder</div>
      <div className="controls">
        <div className="circle-button">
          <Icon icon={faFastBackward} size="sm" />
        </div>
        <div className="circle-button play">
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
