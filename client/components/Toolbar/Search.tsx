import "./Toolbar.scss";
import * as React from "react";
import { MediaApi } from "@client/api/MediaApi";
import { shuffle } from "@client/util";
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

  // Handle the playing of a search result selection
  const playMedia = (file) => async () => {
    clear();

    const { type, match, path } = file;
    const results = (await MediaApi.query(match)).data;
    const should_shuffle = ["artist", "genre"].includes(type);

    history.push(path);

    // onPlay(
    //   should_shuffle
    //     ? shuffle(results)
    //     : results.sort((a, b) => a.track - b.track),
    // );
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
          {results.map(displayResult(playMedia))}
        </div>
      )}
    </div>
  );
};

const displayResult = (handler) => (file) => {
  const [primary, secondary] = file.displayAs;

  return (
    <div className="result" onClick={handler(file)} key={file.path}>
      {primary}
      {secondary !== undefined && <div className="secondary">{secondary}</div>}
    </div>
  );
};
