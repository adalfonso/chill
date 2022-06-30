import "./Playlist.scss";
import React, { useState } from "react";
import { Equalizer } from "../Equalizer";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { RootState } from "@reducers/store";
import { changeTrack } from "@reducers/playerReducer";
import { faListDots, faClose } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";

export const Playlist = () => {
  const player = useSelector((state: RootState) => state.player);
  const dispatch = useDispatch();
  const [playlistVisible, setPlaylistVisible] = useState(false);

  const playlistClassName = playlistVisible
    ? "playlist-panel"
    : "playlist-panel docked";

  const togglePlaylist = () => {
    setPlaylistVisible(!playlistVisible);
  };

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
                  src={`/media/cover/${media.cover.filename}?size=36`}
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
