import "./Playlist.scss";
import React, { useState } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Playlist as PlaylistObject } from "@client/Playlist";
import {
  faListDots,
  faClose,
  faPlayCircle,
} from "@fortawesome/free-solid-svg-icons";

interface PlaylistProps {
  playlist: PlaylistObject;
}

export const Playlist = ({ playlist }: PlaylistProps) => {
  const [playlistVisible, setPlaylistVisible] = useState(false);

  const playlistClassName = playlistVisible
    ? "playlist-panel"
    : "playlist-panel docked";

  const togglePlaylist = () => {
    console.log({ playlistVisible });
    setPlaylistVisible(!playlistVisible);
  };

  return (
    <>
      <div className={playlistClassName}>
        <Icon className="close" icon={faClose} onClick={togglePlaylist} />

        {playlist.items.map((media, i) => (
          <div className="playlist-item">
            <div className="index">{i + 1}</div>

            <div className="content">
              <div className="artist">{media.artist}</div>
              <div className="title">{media.title}</div>
            </div>
            <div className="playing">
              {playlist.current === media && <Icon icon={faPlayCircle} />}
            </div>
          </div>
        ))}
      </div>
      <Icon className="playlist" icon={faListDots} onClick={togglePlaylist} />
    </>
  );
};
