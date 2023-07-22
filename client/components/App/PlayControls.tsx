import "./PlayControls.scss";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Playlist } from "./PlayControls/Playlist";
import { Scrubber } from "./PlayControls/Scrubber";
import { Shuffle } from "./PlayControls/Shuffle";
import { VolumeControl } from "./PlayControls/VolumeControl";
import { getState } from "@reducers/store";
import { noPropagate } from "@client/lib/util";
import { screen_breakpoint_px } from "@client/lib/constants";
import { useBackNavigate } from "@client/hooks/useBackNavigate";
import { useDispatch, useSelector } from "react-redux";
import { useViewport } from "@client/hooks/useViewport";
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
import { useId } from "@client/hooks/useObjectId";
import { FileMenu } from "./MediaViewer/FileMenu";
import { albumUrl, artistUrl } from "@client/lib/url";
import { useNavigate } from "react-router-dom";

const default_now_playing = "";

export const PlayControls = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const menu_id = useId();
  const { player } = useSelector(getState);
  const { width } = useViewport();
  const is_mobile = width < screen_breakpoint_px;
  const is_fullscreen =
    is_mobile && player.mobile_display_mode === MobileDisplayMode.Fullscreen;

  // Helper that gets the "now playing" section
  const getNowPlaying = () =>
    player.now_playing ? (
      <>
        <div>{player.now_playing.title}</div>
        <div className="artist">{player.now_playing.artist}</div>
      </>
    ) : (
      default_now_playing
    );

  // Toggle audio play / pause
  const togglePlayer = async () => {
    const operation = player.is_playing ? pause() : play({});
    dispatch(operation);
  };

  // Stop all audio from playing
  const stop = () => {
    dispatch(setMobileDisplayMode(MobileDisplayMode.None));

    dispatch(clear());
  };

  // Minimize the fullscreen player on mobile
  const minimize = () =>
    dispatch(setMobileDisplayMode(MobileDisplayMode.Minimized));

  // Fullscreen the mobile player
  const goFullscreen = () => {
    dispatch(setMobileDisplayMode(MobileDisplayMode.Fullscreen));
  };

  const now_playing = player.now_playing;

  // Minimize the player on back navigation when fullscreen
  useBackNavigate(() => is_fullscreen, minimize);

  return (
    <>
      <div id="play-controls" className={player.mobile_display_mode}>
        <div className="content">
          <div className="controls">
            <Icon icon={faAngleDown} size="xl" onClick={minimize} />
          </div>
          <div className="cover-wrapper">
            <div className="cover">
              {player.now_playing?.cover?.filename && (
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
                onClick={() => dispatch(next({ auto: false }))}
              >
                <Icon icon={faFastForward} />
              </div>
            </div>
          </div>
          <div className="side-panel">
            <div className="icons">
              <Shuffle></Shuffle>
              <div>
                {now_playing !== null && (
                  <FileMenu
                    menu_id={menu_id}
                    title={`${now_playing.artist} - ${now_playing.title}`}
                  >
                    {[
                      <div
                        key="artist"
                        onClick={() => navigate(artistUrl(now_playing))}
                      >
                        Go to Artist
                      </div>,

                      <div
                        key="album"
                        onClick={() => navigate(albumUrl(now_playing))}
                      >
                        Go to Album
                      </div>,
                    ]}
                  </FileMenu>
                )}
              </div>
              <Playlist></Playlist>
            </div>

            <VolumeControl></VolumeControl>
          </div>
        </div>
      </div>
      {player.mobile_display_mode === MobileDisplayMode.Minimized && (
        <div id="play-controls-minimized" onClick={noPropagate(goFullscreen)}>
          {player?.now_playing?.artist} - {player?.now_playing?.title}
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
