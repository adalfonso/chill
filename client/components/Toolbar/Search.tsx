import "./Search.scss";
import * as React from "react";
import * as _ from "lodash";
import { MediaApi } from "@client/api/MediaApi";
import { SearchResult } from "./Search/SearchResult";
import { useHistory } from "react-router-dom";
import { useState } from "react";

export const Search = ({ onPlay }) => {
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
  const visitMedia = async (file) => {
    const { path } = file;

    clear();
    history.push(path);
  };

  // Handle the playing of a search result selection
  const playMedia = async (file) => {
    const { type, match } = file;
    const results = (await MediaApi.query(match)).data;
    const should_shuffle = ["artist", "genre"].includes(type);

    clear();

    onPlay(
      should_shuffle
        ? _.shuffle(results)
        : results.sort((a, b) => a.track - b.track),
    );
  };

  // Clear the search input/results
  const clear = () => {
    setQuery("");
    setResults([]);
  };

  return (
    <div className="search">
      <input
        className="search-box"
        placeholder="search"
        value={query}
        onChange={search}
      />
      {results.length > 0 && (
        <div className="search-results">
          {results.map((result) => {
            return (
              <SearchResult
                result={result}
                onPlay={playMedia}
                onVisit={visitMedia}
                key={`${result.type}|${result.path}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
