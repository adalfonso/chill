import * as React from "react";
import { MediaApi } from "@client/api/MediaApi";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

export const AlbumView = () => {
  const { album } = useParams();
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    MediaApi.getGroupedByAlbum()
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

      <div className="">{tracks.map((track) => ({ track }))}</div>
    </div>
  );
};
