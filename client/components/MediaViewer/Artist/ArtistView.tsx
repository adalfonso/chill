import * as React from "react";
import { Media } from "@common/autogen";
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

    onPlay(results.data.sort((a, b) => a.track - b.track));
  };

  const displayAs = (file: TileData) => {
    const [album, artist, year] = file._id as string[];
    return `${album} (${year})`;
  };

  return (
    <div id="media-viewer">
      <div className="artist-view">
        <div className="info">
          <h2>{artist}</h2>
        </div>

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
    </div>
  );
};
