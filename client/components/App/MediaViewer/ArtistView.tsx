import { Artist } from "@prisma/client";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  AlbumMetadata,
  Maybe,
  MediaTileData,
  MediaTileType,
  PaginationSort,
} from "@common/types";
import { artistAlbumUrl } from "@client/lib/url";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { SmartScroller } from "./SmartScroller";
import { api } from "@client/client";
import { paginate } from "@common/pagination";

type AlbumParams = {
  artist_id: string;
};

export const ArtistView = () => {
  const artist_id = parseInt(useParams<AlbumParams>().artist_id ?? "");
  const [artist, setArtist] = useState<Maybe<Artist>>(null);

  useEffect(() => {
    api.artist.get.query({ id: artist_id }).then(setArtist);
  }, []);

  const loadAlbums = async (page: number) =>
    api.album.getTiles.query({
      options: paginate({ page, sortBy: "year", sort: PaginationSort.desc }),
      getMetadata: true,
      filter: { artist_id },
    });

  return (
    <SmartScroller
      className="artist-view"
      header={artist?.name}
      dependencies={[artist_id.toString()]}
      onScroll={loadAlbums}
      makeItems={makeAlbumTiles(artist_id)}
    ></SmartScroller>
  );
};

const makeAlbumTiles =
  (artist_id: number) => (tiles: Array<MediaTileData<AlbumMetadata>>) =>
    tiles.map((tile) => (
      <MediaTile
        tile_type={MediaTileType.Album}
        key={tile.id}
        tile_data={tile}
        url={() => artistAlbumUrl(artist_id, tile.id)}
        displayAs={({ name, data }: MediaTileData<AlbumMetadata>) =>
          `${name} (${data?.year})`
        }
      />
    ));
