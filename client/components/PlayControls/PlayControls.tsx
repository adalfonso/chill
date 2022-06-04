import "./PlayControls.scss";
import React from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Playlist } from "./Playlist";
import { RootState } from "@client/state/reducers/store";
import { Scrubber } from "./Scrubber";
import { VolumeControl } from "./VolumeControl";
import { next, pause, play, previous } from "@reducers/playerReducer";
import { useDispatch, useSelector } from "react-redux";
import {
  faPlay,
  faPause,
  faFastForward,
  faFastBackward,
} from "@fortawesome/free-solid-svg-icons";

const default_now_playing = "-";

export const PlayControls = () => {
  const player = useSelector((state: RootState) => state.player);
  const dispatch = useDispatch();

  const getNowPlaying = () =>
    player.now_playing
      ? `${player.now_playing.artist} - ${player.now_playing.title}`
      : default_now_playing;

  const togglePlayer = async () => {
    const operation = player.is_playing ? pause() : play({});
    dispatch(operation);
  };

  return (
    <div id="play-controls">
      <Scrubber />
      <div className="panel">
        <div className="side-panel"></div>
        <div className="now-playing">
          {getNowPlaying()}
          <div className="controls">
            <div className="circle-button" onClick={() => dispatch(previous())}>
              <Icon icon={faFastBackward} />
            </div>
            <div className="circle-button play" onClick={togglePlayer}>
              <Icon icon={player.is_playing ? faPause : faPlay} />
            </div>
            <div className="circle-button" onClick={() => dispatch(next())}>
              <Icon icon={faFastForward} />
            </div>
          </div>
        </div>
        <div className="side-panel">
          <VolumeControl></VolumeControl>
          <Playlist></Playlist>
        </div>
      </div>
    </div>
  );
};
