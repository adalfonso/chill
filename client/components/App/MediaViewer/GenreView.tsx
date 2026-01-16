import { Genre } from "@prisma/client";
import { useEffect, useState } from "preact/hooks";

import { Maybe, MediaTileData, MediaTileType, Raw } from "@common/types";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { SmartScroller } from "./SmartScroller";
import { albumUrl, artistUrl } from "@client/lib/Url";
import { api } from "@client/client";
import { paginate } from "@common/pagination";
import { useAppState } from "@hooks/index";
import { useSignal } from "@preact/signals";

type GenreViewProps = {
  genre_id: number;
};

export const GenreView = ({ genre_id }: GenreViewProps) => {
  const { is_loading } = useAppState();
  const { view_path } = useAppState();
  const [genre, setGenre] = useState<Maybe<Raw<Genre>>>(null);
  const category = useSignal<"artist" | "album">("artist");

  const is_genre_view = /^\/library\/genre\/\d+/.test(view_path.value);

  useEffect(() => {
    api.genre.get.query({ id: genre_id }).then(setGenre);
  }, []);

  const loadGenreArtists = async (page: number) => {
    is_loading.value = true;

    return api.artist.getArtistTilesByGenre
      .query({
        options: paginate({ page }),
        genre_id: genre_id,
      })
      .finally(() => (is_loading.value = false));
  };

  const loadGenreAlbums = async (page: number) => {
    is_loading.value = true;

    return api.album.getAlbumTilesByGenre
      .query({
        options: paginate({ page }),
        genre_id: genre_id,
      })
      .finally(() => (is_loading.value = false));
  };

  const loadItems =
    category.value === "artist" ? loadGenreArtists : loadGenreAlbums;

  const makeItems =
    category.value === "artist" ? makeArtistGenreTiles : makeAlbumGenreTiles;

  return (
    <>
      {/* This will render when in the library stack so we need to conditionally hide this otherwise it will show on other pages */}
      {is_genre_view && (
        <section className="scroller-header">
          <div
            className={category.value === "artist" ? "active" : ""}
            onClick={() => (category.value = "artist")}
          >
            By Artist
          </div>
          <div
            className={category.value === "album" ? "active" : ""}
            onClick={() => (category.value = "album")}
          >
            By Album
          </div>
        </section>
      )}

      <SmartScroller
        className="genre-view"
        header={genre?.name ?? ""}
        dependencies={[genre_id.toString(), category.value]}
        onScroll={loadItems}
        makeItems={makeItems}
      ></SmartScroller>
    </>
  );
};

const makeArtistGenreTiles = (tiles: Array<MediaTileData>) =>
  tiles.map((tile, index) => (
    <MediaTile
      tile_type={MediaTileType.Artist}
      index={index}
      key={tile.id}
      tile_data={tile}
      url={() => artistUrl(tile.id)}
      displayAs={({ name }: MediaTileData) => `${name} `}
    />
  ));

const makeAlbumGenreTiles = (tiles: Array<MediaTileData>) =>
  tiles.map((tile, index) => (
    <MediaTile
      tile_type={MediaTileType.Album}
      index={index}
      key={tile.id}
      tile_data={tile}
      url={() => albumUrl()(tile.id)}
      displayAs={({ name }: MediaTileData) => `${name} `}
    />
  ));
