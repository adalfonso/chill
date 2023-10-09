import { GroupedMedia } from "@common/types";
import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch } from "@common/media/types";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { SmartScroller } from "./SmartScroller";
import { albumUrl } from "@client/lib/url";
import { fetchReducer } from "@hooks/index";
import { useParams } from "react-router-dom";
import { useReducer } from "react";

interface ArtistViewProps {
  setLoading: (loading: boolean) => void;
}

type AlbumParams = {
  artist: string;
};

export const ArtistView = ({ setLoading }: ArtistViewProps) => {
  const artist = useParams<AlbumParams>().artist ?? "";

  const [media_data, mediaDispatch] = useReducer(fetchReducer<GroupedMedia>, {
    items: [],
    busy: true,
  });

  const loadAlbums = async (page: number) => {
    setLoading(true);

    return MediaApi.getGroupedByAlbum({ page, limit: 24 }, artist).then(
      (data) => data.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
    );
  };

  const displayAs = ({ album, year }: GroupedMedia) => `${album} (${year})`;

  return (
    <SmartScroller
      className="artist-view"
      header={artist}
      mediaDispatch={mediaDispatch}
      resetPagerOn={[artist]}
      onInfiniteScroll={loadAlbums}
      onInfiniteScrollDone={() => setLoading(false)}
    >
      {media_data.items.map((file) => (
        <MediaTile
          tile_type={MediaMatch.Album}
          key={JSON.stringify(file._id)}
          file={{ ...file, artist }}
          url={albumUrl}
          displayAs={displayAs}
        />
      ))}
    </SmartScroller>
  );
};
