import { useLocation } from "wouter-preact";
import { useState } from "preact/hooks";

import "./Search.scss";
import { SearchResult as SearchResultType } from "@common/types";
import { SearchResult } from "./Search/SearchResult";
import { api } from "@client/client";
import { useDebounce } from "@hooks/index";
import { Close } from "@client/components/ui/Close";

export const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultType[]>([]);
  const [, navigate] = useLocation();

  useDebounce(
    async () => {
      if (query === "") {
        return clear();
      }

      try {
        const results = await api.media.search.query({ query });
        setResults(results);
      } catch (err) {
        console.error(`Search Failed:`, (err as Error).message);
      }
    },
    [query],
    300,
  );

  // Visit page for search result
  const visitMedia = async (file: SearchResultType) => {
    const { path } = file;

    clear();
    navigate(path);
  };

  // Clear the search input/results
  const clear = () => {
    setQuery("");
    setResults([]);
  };

  return (
    <div className="search">
      <input
        placeholder="search"
        value={query}
        onChange={(e) =>
          setQuery((e.target as HTMLInputElement).value.replace(/\s+/g, " "))
        }
      />
      {query.length > 0 && <Close onClose={clear} size="xxs" />}
      {results.length > 0 && (
        <div className="search-results">
          {results.map((result) => {
            return (
              <SearchResult
                result={result}
                onVisit={visitMedia}
                key={result.displayAs.join("|") + result.value}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
