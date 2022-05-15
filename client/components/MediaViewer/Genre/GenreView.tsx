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
  const genre = decodeURIComponent(useParams().genre);
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    setLoading(true);

    MediaApi.getGroupedByArtist({}, genre)
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

  const url = (file: TileData) => `/artist/${encodeURIComponent(file.artist)}`;

  const use = async (file: TileData) => {
    const { artist } = file;
    const results = await MediaApi.query({ artist });

    onPlay(results.data);
  };

  const displayAs = (file: TileData) => file.artist;

  return (
    <div id="media-viewer">
      <div className="genre-view">
        <div className="info">
          <h2>{genre}</h2>
        </div>

        <div className="media-tiles">
          {artists.map((file) => (
            <MediaTile
              key={JSON.stringify(file._id)}
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
