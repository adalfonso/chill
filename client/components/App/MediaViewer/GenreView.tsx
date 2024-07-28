import { Genre } from "@prisma/client";
import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { AppContext } from "@client/state/AppState";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { Maybe, MediaTileData, MediaTileType } from "@common/types";
import { SmartScroller } from "./SmartScroller";
import { artistUrl } from "@client/lib/url";
import { api } from "@client/client";
import { paginate } from "@common/pagination";

type GenreParams = {
  genre_id: string;
};

export const GenreView = () => {
  const genre_id = parseInt(useParams<GenreParams>().genre_id ?? "");
  const { is_busy } = useContext(AppContext);
  const [genre, setGenre] = useState<Maybe<Genre>>(null);

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
