import * as React from "react";
import { MediaApi } from "@client/api/MediaApi";
import { MediaTile, TileData } from "../MediaTile/MediaTile";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

export const GenreView = () => {
  const { genre } = useParams();
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    MediaApi.getGroupedByArtist(genre)
      .then((res) => {
        setArtists(res.data);
      })
      .catch((err) => {
        console.error("Failed to load artist albums");
      });
  }, []);

  const url = (file: TileData) => `/artist/${file._id[0]}`;

  const displayAs = (file: TileData) => file._id[0];

  return (
    <div className="genre-view">
      <h2>{genre}</h2>

      <div className="media-tiles">
        {artists.map((file) => (
          <MediaTile
            key={file._id}
            file={file}
            url={url}
            displayAs={displayAs}
          />
        ))}
      </div>
    </div>
  );
};
