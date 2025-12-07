import { api } from "@client/client";
import { capitalize } from "@common/commonUtils";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

import type { LibraryCounts } from "@common/apiTypes";

export const LibraryStats = () => {
  const counts = useSignal<LibraryCounts>({
    tracks: 0,
    artists: 0,
    compilations: 0,
    splits: 0,
    albums: 0,
    genres: 0,
  });

  const size = useSignal<string>("0KB");

  useEffect(() => {
    api.libraryHealth.libraryCounts.query().then((data) => {
      counts.value = data;
    });

    api.libraryHealth.librarySize.query().then((data) => {
      size.value = data;
    });
  }, []);

  return (
    <div className="setting-artist-ambiguous-genre setting">
      <h2>Library stats</h2>
      {Object.keys(counts.value).map((key) => {
        return (
          <ul key={key}>
            <li>
              <strong>{capitalize(key).replaceAll("_", " ")}: </strong>
              {counts.value[key as keyof typeof counts.value]}
            </li>
          </ul>
        );
      })}
    </div>
  );
};
