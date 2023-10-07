import { GroupedMedia } from "@common/types";
import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch } from "@common/media/types";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { SmartScroller } from "./SmartScroller";
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
  const [artists, setArtists] = useState<GroupedMedia[]>([]);

  useEffect(() => {
    setLoading(true);

    MediaApi.getGroupedByArtist(undefined, genre)
      .then(setArtists)
      .catch(({ message }) =>
        console.error("Failed to load artist albums:", message),
      )
      .finally(() => setLoading(false));
  }, [genre]);

  const displayAs = (file: GroupedMedia) => file.artist ?? "";

  return (
    <SmartScroller className="genre-view" header={genre}>
      {artists.map((file) => (
        <MediaTile
          tile_type={MediaMatch.Genre}
          key={JSON.stringify(file._id)}
          file={file}
          url={artistUrl}
          displayAs={displayAs}
        />
      ))}
    </SmartScroller>
  );
};
