import { useState, useEffect } from "react";
import { MediaApi } from "@client/api/MediaApi";
import { MediaTile, TileData } from "./MusicLibrary/MediaTile";
import { useParams } from "react-router-dom";

interface GenreViewProps {
  setLoading: (loading: boolean) => void;
}

interface GenreParams {
  genre: string;
}

export const GenreView = ({ setLoading }: GenreViewProps) => {
  const genre = decodeURIComponent(useParams<GenreParams>().genre);
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    setLoading(true);

    MediaApi.getGroupedByArtist(undefined, genre)
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
  const displayAs = (file: TileData) => file.artist;

  return (
    <div id="media-viewer">
      <div className="genre-view wide">
        <div className="info">
          <h2>{genre}</h2>
        </div>

        <div className="media-tiles">
          {artists.map((file) => (
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
