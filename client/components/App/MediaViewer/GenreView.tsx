import { Genre } from "@prisma/client";
import { useEffect, useState } from "preact/hooks";

import { Maybe, MediaTileData, MediaTileType, Raw } from "@common/types";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { SmartScroller } from "./SmartScroller";
import { api } from "@client/client";
import { artistUrl } from "@client/lib/Url";
import { paginate } from "@common/pagination";
import { useAppState } from "@hooks/index";

type GenreViewProps = {
  genre_id: number;
};

export const GenreView = ({ genre_id }: GenreViewProps) => {
  const { is_busy } = useAppState();
  const [genre, setGenre] = useState<Maybe<Raw<Genre>>>(null);

  useEffect(() => {
    api.genre.get.query({ id: genre_id }).then(setGenre);
  }, []);

  const loadGenreArtists = async (page: number) => {
    is_busy.value = true;

    return api.artist.getArtistTilesByGenre.query({
      options: paginate({ page }),
      genre_id: genre_id,
    });
  };

  return (
    <SmartScroller
      className="genre-view"
      header={genre?.name ?? ""}
      dependencies={[genre_id.toString()]}
      onScroll={loadGenreArtists}
      makeItems={makeArtistGenreTiles}
    ></SmartScroller>
  );
};

const makeArtistGenreTiles = (tiles: Array<MediaTileData>) =>
  tiles.map((tile) => (
    <MediaTile
      tile_type={MediaTileType.Artist}
      key={tile.id}
      tile_data={tile}
      url={() => artistUrl(tile.id)}
      displayAs={({ name }: MediaTileData) => `${name} `}
    />
  ));
