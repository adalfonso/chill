import { GroupedMedia } from "@common/types";
import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch } from "@common/media/types";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { albumUrl } from "@client/lib/url";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

interface ArtistViewProps {
  setLoading: (loading: boolean) => void;
}

type AlbumParams = {
  artist: string;
};

export const ArtistView = ({ setLoading }: ArtistViewProps) => {
  const artist = decodeURIComponent(useParams<AlbumParams>().artist ?? "");
  const [albums, setAlbums] = useState<GroupedMedia[]>([]);

  useEffect(() => {
    loadAlbums();
  }, [artist]);

  const loadAlbums = async () => {
    setLoading(true);

    return MediaApi.getGroupedByAlbum(undefined, artist)
      .then((data) =>
        setAlbums(data.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))),
      )
      .catch(({ message }) =>
        console.error("Failed to load artist albums:", { message }),
      )
      .finally(() => setLoading(false));
  };

  const displayAs = (file: GroupedMedia) => {
    const { album, year } = file;
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
              tile_type={MediaMatch.Album}
              key={JSON.stringify(file._id)}
              file={file}
              url={albumUrl}
              displayAs={displayAs}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
