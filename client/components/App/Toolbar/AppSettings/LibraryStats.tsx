import { api } from "@client/client";
import { capitalize } from "@common/commonUtils";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

type LibraryStats = {
  tracks: number;
  artists: number;
  genres: number;
  library_size: string;
};

export const LibraryStats = () => {
  const stats = useSignal<LibraryStats>({
    tracks: 0,
    artists: 0,
    genres: 0,
    library_size: "0KB",
  });

  useEffect(() => {
    api.libraryHealth.libraryStats.query().then((data) => {
      stats.value = data;
    });
  }, []);

  return (
    <div className="setting-artist-ambiguous-genre setting">
      <h2>Library stats</h2>
      {Object.keys(stats.value).map((key) => {
        return (
          <ul key={key}>
            <li>
              <strong>{capitalize(key).replaceAll("_", " ")}: </strong>
              {stats.value[key as keyof typeof stats.value]}
            </li>
          </ul>
        );
      })}
    </div>
  );
};
