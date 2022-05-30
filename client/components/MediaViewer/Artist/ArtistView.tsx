import React, { useState, useEffect } from "react";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { MediaTile, TileData } from "../MediaTile/MediaTile";
import { useParams } from "react-router-dom";

interface ArtistViewProps {
  onPlay: (files: Media[], index?: number) => void;
  setLoading: (loading: boolean) => void;
}

type AlbumParams = {
  artist: string;
};

export const ArtistView = ({ onPlay, setLoading }: ArtistViewProps) => {
  const artist = decodeURIComponent(useParams<AlbumParams>().artist);
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    loadAlbums();
  }, [artist]);

  const loadAlbums = async () => {
    setLoading(true);

    return MediaApi.getGroupedByAlbum(undefined, artist)
      .then((res) => {
        setAlbums(res.data.sort((a, b) => b.year - a.year));
      })
      .catch((err) => {
        console.error("Failed to load artist albums");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const url = (file: TileData) => `/album/${encodeURIComponent(file.album)}`;

  const use = async (file: TileData) => {
    const { artist, album, year } = file;
    const results = await MediaApi.query({ artist, album, year });

    onPlay(results.data.sort((a, b) => a.track - b.track));
  };

  const displayAs = (file: TileData) => {
    const { album, artist, year } = file;
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
