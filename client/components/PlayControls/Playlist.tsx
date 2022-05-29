import "./Playlist.scss";
import React, { useState } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { RootState } from "@client/state/reducers/store";
import { useDispatch, useSelector } from "react-redux";
import { changeTrack } from "@client/state/reducers/playerReducer";
import {
  faListDots,
  faClose,
  faPlayCircle,
} from "@fortawesome/free-solid-svg-icons";

export const Playlist = () => {
  const player = useSelector<RootState>((state) => state.player);
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
            key={media._id}
          >
            <div className="index">{index + 1}</div>

            <div className="content">
              <div className="artist">{media.artist}</div>
              <div className="title">{media.title}</div>
            </div>
            <div className="playing">
              {player.now_playing === media && <Icon icon={faPlayCircle} />}
            </div>
          </div>
        ))}
      </div>
      <Icon className="playlist" icon={faListDots} onClick={togglePlaylist} />
    </>
  );
};
