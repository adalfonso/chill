import { api } from "@client/client";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { AmbiguousArtistGenre as AmbiguousArtistGenreType } from "@common/types";

export const AmbiguousArtistGenre = () => {
  const ambigouous_artist_genre = useSignal<Array<AmbiguousArtistGenreType>>(
    [],
  );

  useEffect(() => {
    api.libraryHealth.ambiguousArtistGenre.query().then((data) => {
      ambigouous_artist_genre.value = data;
    });
  }, []);

  return (
    <div className="setting-artist-ambiguous-genre setting">
      <h2>Ambiguous genre</h2>
      {ambigouous_artist_genre.value.map((entry) => {
        return (
          <div key={entry.artist}>
            {entry.artist}
            {entry.genres.map((genre) => (
              <div className="ambiguous-genre" key={genre}>
                {genre}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
