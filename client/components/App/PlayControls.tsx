import "./PlayControls.scss";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Playlist } from "./PlayControls/Playlist";
import { Scrubber } from "./PlayControls/Scrubber";
import { Shuffle } from "./PlayControls/Shuffle";
import { VolumeControl } from "./PlayControls/VolumeControl";
import { getState } from "@reducers/store";
import { noPropagate } from "@client/util";
import { useDispatch, useSelector } from "react-redux";
import {
  clear,
  MobileDisplayMode,
  next,
  pause,
  play,
  previous,
  setMobileDisplayMode,
} from "@reducers/player";
import {
  faPlay,
  faPause,
  faFastForward,
  faFastBackward,
  faAngleDown,
  faClose,
} from "@fortawesome/free-solid-svg-icons";

const default_now_playing = "";

export const PlayControls = () => {
  const { player } = useSelector(getState);
  const dispatch = useDispatch();

  const getNowPlaying = () =>
    player.now_playing
      ? `${player.now_playing.artist} - ${player.now_playing.title}`
      : default_now_playing;

  const togglePlayer = async () => {
    const operation = player.is_playing ? pause() : play({});
    dispatch(operation);
  };

  // Stop all audio from playing
  const stop = () => {
    dispatch(
      setMobileDisplayMode({ mobile_display_mode: MobileDisplayMode.None }),
    );

    dispatch(clear());
  };

  const goFullscreen = () => {
    dispatch(
      setMobileDisplayMode({
        mobile_display_mode: MobileDisplayMode.Fullscreen,
      }),
    );
  };

  return (
    <>
      <div id="play-controls" className={player.mobile_display_mode}>
        <div className="content">
          <div className="controls">
            <Icon
              icon={faAngleDown}
              size="lg"
              onClick={() =>
                dispatch(
                  setMobileDisplayMode({
                    mobile_display_mode: MobileDisplayMode.Minimized,
                  }),
                )
              }
            />
          </div>
          <div className="cover-wrapper">
            <div className="cover">
              {player.now_playing?.cover?.data && (
                <img
                  src={`/api/v1/media/cover/${player.now_playing?._id}?size=256`}
                  loading="lazy"
                />
              )}
            </div>
          </div>
        </div>
        <Scrubber />
        <div className="panel">
          <div className="side-panel"></div>
          <div className="now-playing">
            <div className="title">{getNowPlaying()}</div>

            <div className="controls">
              <div
                className="circle-button"
                onClick={() => dispatch(previous())}
              >
                <Icon icon={faFastBackward} />
              </div>
              <div className="circle-button play" onClick={togglePlayer}>
                <Icon icon={player.is_playing ? faPause : faPlay} />
              </div>
              <div
                className="circle-button"
                onClick={() => dispatch(next(false))}
              >
                <Icon icon={faFastForward} />
              </div>
            </div>
          </div>
          <div className="side-panel">
            <div className="icons">
              <Shuffle></Shuffle>
              <Playlist></Playlist>
            </div>

            <VolumeControl></VolumeControl>
          </div>
        </div>
      </div>
      {player.mobile_display_mode === MobileDisplayMode.Minimized && (
        <div id="play-controls-minimized" onClick={noPropagate(goFullscreen)}>
          {getNowPlaying()}
          <div className="controls">
            <Icon
              icon={player.is_playing ? faPause : faPlay}
              onClick={noPropagate(togglePlayer)}
            />
            <Icon icon={faClose} onClick={noPropagate(stop)} />
          </div>
        </div>
      )}
    </>
  );
};
