import { useState } from "preact/hooks";
import { useSelector } from "react-redux";

import "./Playlist.scss";
import { Close } from "@client/components/ui/Close";
import { DottedListIcon } from "@client/components/ui/icons/DottedListIcon";
import { Equalizer } from "../../ui/Equalizer";
import { getPlayerState } from "@reducers/store";
import { useBackNavigate, usePlay } from "@hooks/index";

export const Playlist = () => {
  const player = useSelector(getPlayerState);
  const play = usePlay();
  const [playlist_visible, setPlaylistVisible] = useState(false);

  const playlistClassName = playlist_visible
    ? "playlist-panel"
    : "playlist-panel docked";

  const togglePlaylist = () => {
    setPlaylistVisible(!playlist_visible);
  };

  // Minimize the player on back navigation when fullscreen
  useBackNavigate(
    () => playlist_visible,
    () => setPlaylistVisible(false),
  );

  return (
    <>
      <div className={playlistClassName}>
        <Close onClose={togglePlaylist} />
        {player.playlist.map((track, index) => (
          <div
            className="playlist-item"
            onClick={() =>
              play({
                // No new tracks are added
                tracks: [],
                cast_info: player.cast_info,
                play_options: { ...player.play_options },
                skip_reload: true,
                index,
              })
            }
            key={track.id.toString() + index}
          >
            <div className="cover">
              {track.album_art_filename && (
                <img
                  src={`/api/v1/media/cover/${track.album_art_filename}?size=42`}
                  loading="lazy"
                />
              )}
            </div>

            <div className="content">
              <div className="title">{track.title}</div>
              <div className="artist">{track.artist}</div>
            </div>

            {player.now_playing === track && player.is_playing && <Equalizer />}
          </div>
        ))}
      </div>

      <DottedListIcon className="playlist icon-xs" onClick={togglePlaylist} />
    </>
  );
};
