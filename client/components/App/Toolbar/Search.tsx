import "./Search.scss";
import { Close } from "@client/components/ui/Close";
import { MediaApi } from "@client/api/MediaApi";
import { SearchResult as Result } from "@common/types";
import { SearchResult } from "./Search/SearchResult";
import { useDebounce } from "@hooks/index";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const navigate = useNavigate();

  useDebounce(
    async () => {
      if (query === "") {
        return clear();
      }

      try {
        const results = await MediaApi.search(query);
        setResults(results);
      } catch ({ message }) {
        console.error(`Search Failed:`, message);
      }
    },
    [query],
    300,
  );

  // Visit page for search result
  const visitMedia = async (file: Result) => {
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
        onChange={(e) => setQuery(e.target.value.replace(/\s+/g, " "))}
      />
      {query.length > 0 && <Close size="1x" onClose={clear}></Close>}
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
