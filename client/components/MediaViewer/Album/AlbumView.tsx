import "./AlbumView.scss";
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { useParams } from "react-router-dom";
import { Nullable } from "@common/types";

interface AlbumViewProps {
  now_playing: Nullable<Media>;
  onPlay: (files: Media[], index?: number) => void;
  setLoading: (loading: boolean) => void;
}

const secondsToMinutes = (duration: number) => {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration - minutes * 60);
  const pad = (duration: number) => duration.toString().padStart(2, "0");

  return `${minutes}:${pad(seconds)}`;
};

type AlbumParams = {
  album: string;
};

export const AlbumView = ({
  setLoading,
  onPlay,
  now_playing,
}: AlbumViewProps) => {
  const album = decodeURIComponent(useParams<AlbumParams>().album);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    setLoading(true);

    MediaApi.query({ album })
      .then((res) => {
        setFiles(res.data);
      })
      .catch((err) => {
        console.error("Failed to load album tracks data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [album]);

  const onClick = (index) => () => onPlay(files, index);
  const artists = () => [...new Set(files.map((file) => file.artist))];
  const getYear = () => [...new Set(files.map((file) => file.year))].join(",");

  return (
    <div id="media-viewer">
      <div className="album-view">
        <div className="info">
          <h2>{artists().length > 1 ? "Various Artists" : artists()[0]}</h2>
          {artists().length > 1 && <h4>{artists().join(",  ")}</h4>}
          <h4>{album}</h4>
          <h4>{getYear()}</h4>
        </div>

        <div className="panel-list">
          <div className="header track"></div>
          <div className="header"></div>
          <div className="header align-right"></div>

          {files
            .sort((a, b) => a.track - b.track)
            .map((file, index) => {
              return (
                <div className="row" onClick={onClick(index)} key={file.path}>
                  <div className="track">
                    {file.track}
                    {now_playing?.path === file.path && (
                      <Icon
                        className="play-icon"
                        icon={faPlayCircle}
                        size="sm"
                        pull="right"
                      />
                    )}
                  </div>
                  <div>{file.title}</div>
                  <div className="duration mono">
                    {secondsToMinutes(file.duration)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
