import "./PlayControls.scss";
import * as React from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/autogen";
import { Player } from "@client/Player";
import { Playlist as PlaylistObject } from "@client/Playlist";
import { Playlist } from "./Playlist";
import { Scrubber } from "./Scrubber";
import { startAnimationLoop } from "@client/util";
import { useState, useEffect } from "react";
import {
  faPlay,
  faPause,
  faFastForward,
  faFastBackward,
} from "@fortawesome/free-solid-svg-icons";

interface PlayControlsProps {
  player: Player;
  playlist: PlaylistObject;
  onPlay: (files?: Media[], index?: number) => Promise<void>;
}

const default_now_playing = "-";

export const PlayControls = ({
  player,
  playlist,
  onPlay,
}: PlayControlsProps) => {
  const [is_playing, setIsPlaying] = useState(player.is_playing);
  const [now_playing, setNowPlaying] = useState(default_now_playing);
  const [playback_progress, setPlaybackProgress] = useState(0);

  const getNowPlaying = () =>
    player.now_playing
      ? `${player.now_playing.artist} - ${player.now_playing.title}`
      : default_now_playing;

  useEffect(() => {
    startAnimationLoop(() => {
      if (playback_progress === player.progress) {
        return;
      }

      setPlaybackProgress(player.progress);
    });
  }, []);

  /**
   * The next couple checks are necessary to sync operations on Player.ts with
   * the controls in this component as well as operations that take place in
   * other parts of the application
   */
  if (is_playing !== player.is_playing) {
    setIsPlaying(player.is_playing);
    setPlaybackProgress(0);
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

  const seek = async (percent: number) => {
    return player.seek(percent);
  };

  return (
    <div id="play-controls">
      <Scrubber progress={playback_progress} onScrub={seek} />
      <div className="panel">
        <div className="side-panel"></div>
        <div className="now-playing">
          {now_playing}
          <div className="controls">
            <div className="circle-button" onClick={previous}>
              <Icon icon={faFastBackward} />
            </div>
            <div className="circle-button play" onClick={togglePlayer}>
              <Icon icon={is_playing ? faPause : faPlay} />
            </div>
            <div className="circle-button" onClick={next}>
              <Icon icon={faFastForward} />
            </div>
          </div>
        </div>
        <div className="side-panel">
          <Playlist playlist={playlist} onPlay={onPlay}></Playlist>
        </div>
      </div>
    </div>
  );
};
