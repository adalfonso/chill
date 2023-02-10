import "./Playlist.scss";
import { Close } from "@client/components/ui/Close";
import { Equalizer } from "../../ui/Equalizer";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { changeTrack } from "@reducers/player";
import { faListDots } from "@fortawesome/free-solid-svg-icons";
import { getState } from "@reducers/store";
import { useBackNavigate } from "@hooks/useBackNavigate";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";

export const Playlist = () => {
  const { player } = useSelector(getState);
  const dispatch = useDispatch();
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
        <Close onClose={togglePlaylist}></Close>

        {player.playlist.map((media, index) => (
          <div
            className="playlist-item"
            onClick={() => dispatch(changeTrack({ index }))}
            key={media._id.toString() + index}
          >
            <div className="cover">
              {media.cover?.filename && (
                <img
                  src={`/api/v1/media/cover/${media.cover.filename}?size=36`}
                  loading="lazy"
                />
              )}
            </div>

            <div className="content">
              <div className="title">{media.title}</div>
              <div className="artist">
                {media.artist} {media.album ? ` -  ${media.album}` : ""}
              </div>
            </div>

            {player.now_playing === media && player.is_playing && <Equalizer />}
          </div>
        ))}
      </div>
      <Icon className="playlist" icon={faListDots} onClick={togglePlaylist} />
    </>
  );
};
