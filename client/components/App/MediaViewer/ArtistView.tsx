import { Artist } from "@prisma/client";
import { useEffect, useState } from "preact/hooks";

import {
  AlbumMetadata,
  Maybe,
  MediaTileData,
  MediaTileType,
  SortOrder,
  Raw,
} from "@common/types";
import { matchUrl } from "@client/lib/Url";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { SmartScroller } from "./SmartScroller";
import { api } from "@client/client";
import { paginate } from "@common/pagination";

type ArtistViewProps = {
  artist_id: number;
};

export const ArtistView = ({ artist_id }: ArtistViewProps) => {
  const [artist, setArtist] = useState<Maybe<Raw<Artist>>>(null);

  useEffect(() => {
    api.artist.get.query({ id: artist_id }).then(setArtist);
  }, []);

  const loadAlbums = async (page: number) =>
    api.album.getTiles.query({
      options: paginate({
        page,
        sort: [{ year: SortOrder.desc }],
      }),
      getMetadata: true,
      filter: { artist_id },
    });

  return (
    <SmartScroller
      className="artist-view"
      header={artist?.name}
      dependencies={[artist_id.toString()]}
      onScroll={loadAlbums}
      makeItems={makeAlbumTiles}
    ></SmartScroller>
  );
};

const makeAlbumTiles = (tiles: Array<MediaTileData<AlbumMetadata>>) =>
  tiles.map((tile, index) => (
    <MediaTile
      tile_type={MediaTileType.Album}
      index={index}
      key={tile.id}
      tile_data={tile}
      url={() => matchUrl("album")(tile.id)}
      displayAs={({ name, data }: MediaTileData<AlbumMetadata>) =>
        `${name}` + (data?.year ? ` (${data?.year})` : "")
      }
    />
  ));
