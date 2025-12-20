import { useLocation } from "wouter-preact";
import { useSignal } from "@preact/signals";

import "./Search.scss";
import { Close } from "@client/components/ui/Close";
import { CoreViewState } from "@client/state/AppState";
import { MagnifyingGlassIcon } from "@client/components/ui/icons/MagnifyingGlassIcon";
import { MediaTileType, SearchResult as SearchResultType } from "@common/types";
import { SearchResult } from "./Search/SearchResult";
import { api } from "@client/client";
import { useAppState, useDebounce } from "@hooks/index";

const searchGroupSortOrder: Record<MediaTileType, number> = {
  [MediaTileType.Artist]: 1,
  [MediaTileType.Album]: 2,
  [MediaTileType.Track]: 3,
  [MediaTileType.Genre]: 4,
};

const unknownSearchOrder = 10;

export const Search = () => {
  const { view } = useAppState();
  const query = useSignal("");
  const results = useSignal<Map<string, Array<SearchResultType>>>(new Map());
  const [, navigate] = useLocation();

  useDebounce(
    async () => {
      if (query.value === "") {
        return clear();
      }

      try {
        const res = await api.media.search.query({ query: query.value });

        results.value = res.reduce((acc, item) => {
          const items = acc.get(item.type) ?? [];
          items.push(item);
          return acc.set(item.type, items);
        }, new Map<string, Array<SearchResultType>>());
      } catch (err) {
        console.error(`Search Failed:`, (err as Error).message);
      }
    },
    [query.value],
    300,
  );

  // Visit page for search result
  const visitMedia = async (file: SearchResultType) => {
    const { path } = file;

    view.value = CoreViewState.Library;

    clear();
    navigate("/library" + path);
  };

  // Clear the search input/results
  const clear = () => {
    query.value = "";
    results.value = new Map();
  };

  return (
    <div className="search">
      <div className="search-input">
        <div className="search-icon">
          <MagnifyingGlassIcon className="icon-xs" />
        </div>

        <input
          placeholder="search"
          value={query.value}
          onChange={(e) =>
            (query.value = (e.target as HTMLInputElement).value.replace(
              /\s+/g,
              " ",
            ))
          }
        />
        <div className="search-clear">
          {query.value.length > 0 && <Close onClose={clear} size="xxs" />}
        </div>
      </div>

      {results.value.size > 0 && (
        <div className="search-results">
          {results.value
            .entries()
            .toArray()
            .sort(
              ([a], [b]) =>
                (searchGroupSortOrder[a as MediaTileType] ??
                  unknownSearchOrder) -
                (searchGroupSortOrder[b as MediaTileType] ??
                  unknownSearchOrder),
            )
            .map(([key, value]) => {
              return (
                <>
                  <h4>{key.toUpperCase()}</h4>

                  {value.map((result) => {
                    return (
                      <SearchResult
                        result={result}
                        onVisit={visitMedia}
                        key={result.displayAs.join("|") + result.value}
                      />
                    );
                  })}
                </>
              );
            })}
        </div>
      )}
    </div>
  );
};
