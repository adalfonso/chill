import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "wouter-preact";

import "./PlayControls.scss";
import { AudioType } from "@server/lib/media/types";
import { BackwardIcon } from "../ui/icons/BackwardIcon";
import { ChevronDownIcon } from "../ui/icons/ChevronDownIcon";
import { Close } from "../ui/Close";
import { FileInfo } from "./MediaViewer/FileInfo";
import { FileMenu } from "./MediaViewer/FileMenu";
import { ForwardIcon } from "../ui/icons/ForwardIcon";
import { MobileDisplayMode } from "@reducers/player.types";
import { PauseIcon } from "../ui/icons/PauseIcon";
import { PlayIcon } from "../ui/icons/PlayIcon";
import { PlayableTrack } from "@common/types";
import { Playlist } from "./PlayControls/Playlist";
import { Scrubber } from "./PlayControls/Scrubber";
import { Shuffle } from "./PlayControls/Shuffle";
import { VolumeControl } from "./PlayControls/VolumeControl";
import { artistAlbumUrl, artistUrl } from "@client/lib/Url";
import { clear, setMobileDisplayMode } from "@reducers/player";
import { getPlayerState } from "@reducers/store";
import { noPropagate } from "@client/lib/Event";
import { screen_breakpoint_px } from "@client/lib/constants";
import {
  useBackNavigate,
  useId,
  useMenu,
  useNext,
  usePause,
  usePlay,
  usePrevious,
  useViewport,
} from "@hooks/index";

const default_now_playing = "";

const getBitsDisplay = (track: PlayableTrack) => {
  const bitrate = Math.floor((track.bitrate ?? 0) / 1000);

  const is_lossless =
    track.file_type === AudioType.flac || track.file_type === AudioType.alac;

  if (!is_lossless) {
    return bitrate;
  }

  const sample_rate = (track.sample_rate ?? 0) / 1000;

  if (track.bits_per_sample && sample_rate) {
    return `${track.bits_per_sample} / ${sample_rate}`;
  }

  return `${track.bits_per_sample} ${sample_rate}`.trim();
};

export const PlayControls = () => {
  const play = usePlay();
  const pause = usePause();
  const next = useNext();
  const previous = usePrevious();
  const dispatch = useDispatch();
  const [, navigate] = useLocation();
  const file_menu_id = useId();
  const file_info_id = useId();
  const file_info_menu = useMenu(file_info_id);
  const player = useSelector(getPlayerState);
  const { width } = useViewport();
  const is_mobile = width < screen_breakpoint_px;
  const is_fullscreen =
    is_mobile && player.mobile_display_mode === MobileDisplayMode.Fullscreen;

  // Helper that gets the "now playing" section
  const getNowPlaying = () => {
    const track = player.now_playing;
    if (!track) {
      return default_now_playing;
    }

    return (
      <>
        <div className="artist">{track.artist}</div>

        <div className="sub-title">
          <div className="file-type">
            <span>{track.file_type?.toUpperCase()}</span>
          </div>
          <div className="track-title">{track.title}</div>
          <div className="quality">{getBitsDisplay(track)}</div>
        </div>

        {(track.album || track.year) && (
          <div className="track-album">
            {track.album} {(track.year && `(${track.year})`) || ``}
          </div>
        )}
      </>
    );
  };

  // Toggle audio play / pause
  const togglePlayer = async () => (player.is_playing ? pause() : play({}));

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
  const { artist_id, album_id } = player.now_playing ?? {};

  // Minimize the player on back navigation when fullscreen
  useBackNavigate(() => is_fullscreen, minimize);

  return (
    <>
      <div id="play-controls" className={player.mobile_display_mode}>
        <div className="content">
          <div className="controls">
            <ChevronDownIcon onClick={minimize} className="icon-sm" />
          </div>
          <div className="cover-wrapper">
            <div className="cover">
              {player.now_playing?.album_art_filename && (
                <img
                  src={`/api/v1/media/cover/${player.now_playing?.album_art_filename}?size=500`}
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
              <div className="circle-button" onClick={previous}>
                <BackwardIcon className="icon-md" />
              </div>
              <div className="circle-button play" onClick={togglePlayer}>
                {player.is_playing ? (
                  <PauseIcon className="icon-lg" />
                ) : (
                  <PlayIcon className="icon-lg" />
                )}
              </div>
              <div
                className="circle-button"
                onClick={() => next({ auto: false })}
              >
                <ForwardIcon className="icon-md" />
              </div>
            </div>
          </div>
          <div className="side-panel">
            <div className="icons">
              <div>
                {now_playing !== null && (
                  <>
                    <FileMenu
                      menu_id={file_menu_id}
                      title={`${now_playing.artist} - ${now_playing.title}`}
                    >
                      {artist_id ? (
                        <div
                          key="artist"
                          onClick={() =>
                            minimize() && navigate(artistUrl(artist_id))
                          }
                        >
                          Go to Artist
                        </div>
                      ) : (
                        <></>
                      )}

                      {artist_id && album_id ? (
                        <div
                          key="album"
                          onClick={() =>
                            minimize() &&
                            navigate(artistAlbumUrl(artist_id, album_id))
                          }
                        >
                          Go to Album
                        </div>
                      ) : (
                        <></>
                      )}

                      <div key="" onClick={noPropagate(file_info_menu.toggle)}>
                        File Information
                      </div>
                    </FileMenu>

                    {file_info_menu.is_active && (
                      <FileInfo
                        menu_id={file_info_id}
                        file={now_playing}
                      ></FileInfo>
                    )}
                  </>
                )}
              </div>
              <Shuffle></Shuffle>

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
            <div onClick={noPropagate(togglePlayer)}>
              {player.is_playing ? (
                <PauseIcon className="icon-sm" />
              ) : (
                <PlayIcon className="icon-sm" />
              )}
            </div>

            <Close onClose={noPropagate(stop)} size="sm" />
          </div>
        </div>
      )}
    </>
  );
};
