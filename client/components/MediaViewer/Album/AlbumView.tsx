import "./AlbumView.scss";
import * as React from "react";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
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

  return (
    <div id="media-viewer">
      <div className="album-view">
        <h2>{album}</h2>

        <div className="panel-list">
          <div className="header track">Track</div>
          <div className="header">Title</div>
          <div className="header align-right">Duration</div>

          {files
            .sort((a, b) => a.track - b.track)
            .map((track, index) => {
              return (
                <div className="row" onClick={onClick(index)} key={track.path}>
                  <div className="track">{track.track}</div>
                  <div>{track.title}</div>
                  <div className="mono">{secondsToMinutes(track.duration)}</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
