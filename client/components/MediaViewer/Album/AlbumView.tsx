import "./AlbumView.scss";
import * as React from "react";
import { MediaApi } from "@client/api/MediaApi";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

const secondsToMinutes = (duration: number) => {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration - minutes * 60);
  const pad = (duration: number) => duration.toString().padStart(2, "0");

  return `${minutes}:${pad(seconds)}`;
};

export const AlbumView = () => {
  const { album } = useParams();
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    MediaApi.query({ album })
      .then((res) => {
        setTracks(res.data);
      })
      .catch((err) => {
        console.error("Failed to load album tracks data");
      });
  }, []);

  return (
    <div className="album-view">
      <h2>{album}</h2>

      <div className="panel-list">
        <div className="header track">Track</div>
        <div className="header">Title</div>
        <div className="header align-right">Duration</div>

        {tracks
          .sort((a, b) => a.track - b.track)
          .map((track) => {
            return (
              <div className="row">
                <div className="track">{track.track}</div>
                <div>{track.title}</div>
                <div className="mono">{secondsToMinutes(track.duration)}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
