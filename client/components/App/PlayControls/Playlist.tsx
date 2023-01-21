import "./Playlist.scss";
import { Equalizer } from "../../ui/Equalizer";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { changeTrack } from "@reducers/player";
import { faListDots, faClose } from "@fortawesome/free-solid-svg-icons";
import { getState } from "@reducers/store";
import { useDispatch, useSelector } from "react-redux";
import { useLocationOverride } from "@hooks/useLocationOverride";
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

  useLocationOverride(
    // Override location change when the playlist is visible
    () => playlist_visible,
    // Hide the playlist instead of changing location
    () => setPlaylistVisible(false),
  );

  return (
    <>
      <div className={playlistClassName}>
        <Icon className="close" icon={faClose} onClick={togglePlaylist} />

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
