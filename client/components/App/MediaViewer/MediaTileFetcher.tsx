import { MediaTile } from "./MusicLibrary/MediaTile";
import { MediaTileData, MediaTileType } from "@common/types";
import { SmartScroller } from "./SmartScroller";
import { api } from "@client/client";
import { matchUrl } from "@client/lib/Url";
import { paginate } from "@common/pagination";

type MediaTileFetcherProps = {
  type: MediaTileType;
};

export const MediaTileFetcher = ({ type }: MediaTileFetcherProps) => {
  // Cause media files to reload
  const loadMediaFiles = (page: number): Promise<Array<MediaTileData>> =>
    api[type].getTiles.query({ options: paginate({ page }) });

  return (
    <SmartScroller
      dependencies={[type]}
      onScroll={loadMediaFiles}
      makeItems={makeItems(type)}
    ></SmartScroller>
  );
};

const makeItems = (type: MediaTileType) => (tiles: Array<MediaTileData>) =>
  tiles
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((tile, index) => (
      <MediaTile
        tile_type={type}
        key={tile.id}
        index={index}
        tile_data={tile}
        displayAs={(item: MediaTileData) => item.name ?? ""}
        url={(item: MediaTileData) => matchUrl(type)(item.id)}
      />
    ));
