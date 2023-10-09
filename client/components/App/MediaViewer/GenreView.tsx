import { GroupedMedia } from "@common/types";
import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch } from "@common/media/types";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { SmartScroller } from "./SmartScroller";
import { artistUrl } from "@client/lib/url";
import { fetchReducer } from "@hooks/index";
import { useParams } from "react-router-dom";
import { useReducer } from "react";

interface GenreViewProps {
  setLoading: (loading: boolean) => void;
}

type GenreParams = {
  genre: string;
};

export const GenreView = ({ setLoading }: GenreViewProps) => {
  const genre = decodeURIComponent(useParams<GenreParams>().genre ?? "");

  const [media_data, mediaDispatch] = useReducer(fetchReducer<GroupedMedia>, {
    items: [],
    busy: true,
  });

  const loadGenres = (page: number) =>
    MediaApi.getGroupedByArtist({ page, limit: 24 }, genre);

  const displayAs = (file: GroupedMedia) => file.artist ?? "";

  return (
    <SmartScroller
      className="genre-view"
      header={genre}
      mediaDispatch={mediaDispatch}
      resetPagerOn={[genre]}
      onInfiniteScroll={loadGenres}
      onInfiniteScrollDone={() => setLoading(false)}
    >
      {media_data.items.map((file) => (
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
