import React, { useState, useEffect } from "react";
import { MediaApi } from "@client/api/MediaApi";
import { MediaTile, TileData } from "./MusicLibrary/MediaTile";
import { useParams } from "react-router-dom";

interface ArtistViewProps {
  setLoading: (loading: boolean) => void;
}

type AlbumParams = {
  artist: string;
};

export const ArtistView = ({ setLoading }: ArtistViewProps) => {
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

  const url = (file: TileData) =>
    `/album/${encodeURIComponent(file.album)}?artist=${file.artist}` +
    (file._id?.album === null ? `&no_album=1` : ``);

  const displayAs = (file: TileData) => {
    const { _id, album, artist, year } = file;
    return `${album} (${year})`;
  };

  return (
    <div id="media-viewer">
      <div className="artist-view wide">
        <div className="info">
          <h2>{artist}</h2>
        </div>

        <div className="media-tiles">
          {albums.map((file) => (
            <MediaTile
              key={JSON.stringify(file._id)}
              file={file}
              url={url}
              displayAs={displayAs}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
