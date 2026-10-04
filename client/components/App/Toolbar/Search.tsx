import { useLocation } from "wouter-preact";
import { computed, effect, useSignal } from "@preact/signals";
import { useRef } from "preact/hooks";

import "./Search.scss";
import { Close } from "@client/components/ui/Close";
import { CoreViewState } from "@client/state/AppState";
import { ExtendedSearch } from "./Search/ExtendedSearch";
import { MagnifyingGlassIcon } from "@client/components/ui/icons/MagnifyingGlassIcon";
import { SearchResult, SearchResultType } from "@common/types";
import { SearchResultGroup } from "./Search/SearchResultGroup";
import {
  SEARCH_ROW_BUDGET,
  allocateSearchRows,
} from "@client/lib/allocateSearchRows";
import { api } from "@client/client";
import { useAppState, useDebounce } from "@hooks/index";

const searchGroupSortOrder: Partial<Record<SearchResultType, number>> = {
  [SearchResultType.Artist]: 1,
  [SearchResultType.Album]: 2,
  [SearchResultType.Track]: 3,
  [SearchResultType.Genre]: 4,
};

type SearchMode =
  { kind: "compact" } | { kind: "extended"; type: SearchResultType };

const unknownSearchOrder = 10;

export const Search = () => {
  const { view } = useAppState();
  const query = useSignal("");
  const results = useSignal<Map<SearchResultType, SearchResult[]>>(new Map());
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const mode = useSignal<SearchMode>({ kind: "compact" });

  const sortedGroups = computed(() =>
    results.value
      .entries()
      .toArray()
      .sort(
        ([a], [b]) =>
          (searchGroupSortOrder[a] ?? unknownSearchOrder) -
          (searchGroupSortOrder[b] ?? unknownSearchOrder),
      ),
  );

  // Rows each group may show, sharing one budget so empty groups free space
  const visibleRows = computed(() =>
    allocateSearchRows(
      new Map(sortedGroups.value.map(([type, items]) => [type, items.length])),
      SEARCH_ROW_BUDGET,
    ),
  );

  useDebounce(
    async () => {
      if (!query.value.trim()) {
        results.value = new Map();
        return;
      }

      try {
        const res = await api.media.search.query({
          query: query.value,
          limit: SEARCH_ROW_BUDGET + 1, // One more than any group can show, to detect "has more"
        });

        results.value = res.reduce((acc, item) => {
          const items = acc.get(item.type) ?? [];
          items.push(item);
          return acc.set(item.type, items);
        }, new Map<SearchResultType, Array<SearchResult>>());
      } catch (err) {
        console.error(`Search Failed:`, (err as Error).message);
      }
    },
    [query.value],
    300,
  );

  effect(() => {
    if (view.value === CoreViewState.Search) {
      inputRef.current?.focus();
    }
  });

  // Visit page for search result
  const visitMedia = async (file: SearchResult) => {
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

  switch (mode.value.kind) {
    case "compact":
      return (
        <div id="main-search" className="search">
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
              {sortedGroups.value.map(([type, items]) => (
                <SearchResultGroup
                  key={type}
                  type={type}
                  items={items}
                  visible={visibleRows.value.get(type) ?? 0}
                  onVisit={visitMedia}
                  onExpand={() => (mode.value = { kind: "extended", type })}
                />
              ))}
            </div>
          )}
        </div>
      );

    case "extended":
      return (
        <ExtendedSearch
          type={mode.value.type}
          term={query.value}
          onClose={() => (mode.value = { kind: "compact" })}
        />
      );
  }
};
