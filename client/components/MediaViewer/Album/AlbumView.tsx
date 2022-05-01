import "./AlbumView.scss";
import * as React from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { Player } from "@client/Player";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { useMultiClick } from "@client/hooks/useMultiClick";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

interface AlbumViewProps {
  onPlay: (files: Media[], index?: number) => Promise<void>;
}

const secondsToMinutes = (duration: number) => {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration - minutes * 60);
  const pad = (duration: number) => duration.toString().padStart(2, "0");

  return `${minutes}:${pad(seconds)}`;
};

export const AlbumView = ({ onPlay }: AlbumViewProps) => {
  const { album } = useParams();
  const [files, setFiles] = useState([]);
  const [index_last_clicked, setIndexLastClicked] = useState(0);

  useEffect(() => {
    MediaApi.query({ album })
      .then((res) => {
        setFiles(res.data);
      })
      .catch((err) => {
        console.error("Failed to load album tracks data");
      });
  }, []);

  const handleClick = useMultiClick(
    () => {},
    () => onPlay(files, index_last_clicked),
  );

  const onClick = (index) => () => {
    setIndexLastClicked(index);
    handleClick();
  };

  const getArtist = () =>
    [...new Set(files.map((file) => file.artist))].join(",");

  const getYear = () => [...new Set(files.map((file) => file.year))].join(",");

  return (
    <div id="media-viewer">
      <div className="album-view">
        <div className="info">
          <h2>{getArtist()}</h2>
          <h4>{album}</h4>
          <h4>{getYear()}</h4>
        </div>

        <div className="panel-list">
          <div className="header track">Track</div>
          <div className="header">Title</div>
          <div className="header align-right">Duration</div>

          {files
            .sort((a, b) => a.track - b.track)
            .map((file, index) => {
              return (
                <div className="row" onClick={onClick(index)} key={file.path}>
                  <div className="track">
                    {file.track}
                    {Player.instance().now_playing?.path === file.path && (
                      <Icon
                        className="play-icon"
                        icon={faPlay}
                        size="sm"
                        pull="right"
                      />
                    )}
                  </div>
                  <div>{file.title}</div>
                  <div className="mono">{secondsToMinutes(file.duration)}</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
