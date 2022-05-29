import "./Search.scss";
import * as _ from "lodash";
import React, { useState } from "react";
import { MediaApi } from "@client/api/MediaApi";
import { SearchResult } from "./Search/SearchResult";
import { useHistory } from "react-router-dom";
import { useDispatch } from "react-redux";
import { play } from "@client/state/reducers/playerReducer";

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
    const dispatch = useDispatch();

    clear();

    const files = should_shuffle
      ? _.shuffle(results)
      : results.sort((a, b) => a.track - b.track);

    dispatch(play({ files }));
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
                key={result.displayAs.join("|") + result.value}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
