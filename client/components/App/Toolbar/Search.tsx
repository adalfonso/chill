import "./Search.scss";
import { MediaApi } from "@client/api/MediaApi";
import { SearchResult as Result } from "@common/types";
import { SearchResult } from "./Search/SearchResult";
import { useDebounce } from "@hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useDebounce(
    async () => {
      if (query === "") {
        return clear();
      }

      const results = await MediaApi.search(query);

      setResults(results.data);
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
      {query.length > 0 && (
        <div className="close" onClick={clear}>
          &times;
        </div>
      )}
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
