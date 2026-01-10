import { useLocation } from "wouter-preact";
import { effect, useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

import "./Search.scss";
import { Close } from "@client/components/ui/Close";
import { CoreViewState } from "@client/state/AppState";
import { MagnifyingGlassIcon } from "@client/components/ui/icons/MagnifyingGlassIcon";
import { MediaTileType, SearchResult as SearchResultType } from "@common/types";
import { SearchResult } from "./Search/SearchResult";
import { api } from "@client/client";
import { useAppState, useDebounce } from "@hooks/index";

const searchGroupSortOrder: Partial<Record<MediaTileType, number>> = {
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
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (view.value === CoreViewState.Search) {
      inputRef.current?.focus();
    }
  }, [view.value]);

  // Visit page for search result
  const visitMedia = async (file: SearchResultType) => {
    const { path } = file;

    view.value = CoreViewState.Library;

    navigate("/library" + path);
  };

  // Clear the search input/results
  const clear = () => {
    query.value = "";
    results.value = new Map();
    inputRef.current?.focus();
  };

  return (
    <div className="search">
      <div className="search-input">
        <div className="search-icon">
          <MagnifyingGlassIcon className="icon-xs" />
        </div>

        <input
          ref={inputRef}
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
