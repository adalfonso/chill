import * as React from "react";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { MediaTile, TileData } from "../MediaTile/MediaTile";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

interface GenreViewProps {
  onPlay: (files: Media[]) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const GenreView = ({ onPlay, setLoading }: GenreViewProps) => {
  const { genre } = useParams();
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    setLoading(true);

    MediaApi.getGroupedByArtist(genre)
      .then((res) => {
        setArtists(res.data);
      })
      .catch((err) => {
        console.error("Failed to load artist albums");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [genre]);

  const url = (file: TileData) => `/artist/${file._id[0]}`;

  const use = async (file: TileData) => {
    const { genre } = file;
    const results = await MediaApi.query({ genre });

    onPlay(results.data);
  };

  const displayAs = (file: TileData) => file._id[0];

  return (
    <div id="media-viewer">
      <div className="genre-view">
        <div className="info">
          <h2>{genre}</h2>
        </div>

        <div className="media-tiles">
          {artists.map((file) => (
            <MediaTile
              key={file._id}
              file={file}
              url={url}
              use={use}
              displayAs={displayAs}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
