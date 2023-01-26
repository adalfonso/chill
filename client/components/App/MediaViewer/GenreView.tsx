import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch } from "@common/media/types";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { TileData } from "@client/lib/types";
import { artistUrl } from "@client/lib/url";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

interface GenreViewProps {
  setLoading: (loading: boolean) => void;
}

type GenreParams = {
  genre: string;
};

export const GenreView = ({ setLoading }: GenreViewProps) => {
  const genre = decodeURIComponent(useParams<GenreParams>().genre ?? "");
  const [artists, setArtists] = useState<TileData[]>([]);

  useEffect(() => {
    setLoading(true);

    MediaApi.getGroupedByArtist(undefined, genre)
      .then(setArtists)
      .catch(({ message }) =>
        console.error("Failed to load artist albums:", message),
      )
      .finally(() => setLoading(false));
  }, [genre]);

  const displayAs = (file: TileData) => file.artist ?? "";

  return (
    <div id="media-viewer">
      <div className="genre-view wide">
        <div className="info">
          <h2>{genre}</h2>
        </div>

        <div className="media-tiles">
          {artists.map((file) => (
            <MediaTile
              tile_type={MediaMatch.Genre}
              key={JSON.stringify(file._id)}
              file={file}
              url={artistUrl}
              displayAs={displayAs}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
