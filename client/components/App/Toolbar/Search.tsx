import "./Search.scss";
import React, { useState } from "react";
import { MediaApi } from "@client/api/MediaApi";
import { SearchResult as Result } from "@common/types";
import { SearchResult } from "./Search/SearchResult";
import { useHistory } from "react-router-dom";

export const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const history = useHistory();

  // Execute a media search
  const search = async (e) => {
    const value = e.target.value.replace(/\s+/g, " ");
    setQuery(value);

    if (value === "") {
      return clear();
    }
    const results = await MediaApi.search(value);

    setResults(results.data);
  };

  // Visit page for search result
  const visitMedia = async (file: Result) => {
    const { path } = file;

    clear();
    history.push(path);
  };

  // Clear the search input/results
  const clear = () => {
    setQuery("");
    setResults([]);
  };

  return (
    <div className="search">
      <input placeholder="search" value={query} onChange={search} />
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
