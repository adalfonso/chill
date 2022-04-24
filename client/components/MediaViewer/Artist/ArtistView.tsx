import * as React from "react";
import { Media } from "@server/models/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { MediaTile, TileData } from "../MediaTile/MediaTile";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

interface ArtistViewProps {
  onPlay: (files: Media[]) => Promise<void>;
}

export const ArtistView = ({ onPlay }: ArtistViewProps) => {
  const { artist } = useParams();
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    MediaApi.getGroupedByAlbum(artist)
      .then((res) => {
        setAlbums(res.data);
      })
      .catch((err) => {
        console.error("Failed to load artist albums");
      });
  }, []);

  const url = (file: TileData) => `/album/${file._id[0]}`;

  const use = async (file: TileData) => {
    const { artist, album, year } = file;
    const results = await MediaApi.query({ artist, album, year });

    onPlay(results.data);
  };

  const displayAs = (file: TileData) => {
    const [album, artist, year] = file._id as string[];
    return `${album} (${year})`;
  };

  return (
    <div className="artist-view">
      <h2>{artist}</h2>

      <div className="media-tiles">
        {albums.map((file) => (
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
  );
};
