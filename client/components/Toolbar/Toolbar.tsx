import "./Toolbar.scss";
import * as React from "react";
import axios from "axios";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { MediaApi } from "@client/api/MediaApi";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { shuffle } from "@client/util";
import { useHistory } from "react-router-dom";
import { useState } from "react";

export const Toolbar = ({ onPlay }) => {
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [search_results, setSearchResults] = useState([]);
  const history = useHistory();

  // Cause file scanner to run
  const scan = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    await triggerScan();
    setBusy(false);
  };

  // Execute a media search
  const search = async (e) => {
    const value = e.target.value.replace(/\s+/g, " ");
    setQuery(value);

    if (value === "") {
      return clear();
    }
    const results = await MediaApi.search(value);

    setSearchResults(results.data);
  };

  // Handle the playing of a search result selection
  const playMedia = (file) => async () => {
    clear();

    const { type, match } = file;
    const results = (await MediaApi.query(match)).data;
    const should_shuffle = ["artist", "genre"].includes(type);

    onPlay(
      should_shuffle
        ? shuffle(results)
        : results.sort((a, b) => a.track - b.track),
    );
  };

  // Clear the search input/results
  const clear = () => {
    setQuery("");
    setSearchResults([]);
  };

  return (
    <div id="toolbar">
      <div className="libraries">
        <div className="library-title" onClick={() => history.push("/")}>
          Music
        </div>
      </div>
      <div className="search">
        <input
          className="search-box"
          placeholder="search"
          value={query}
          onChange={search}
        />
        {search_results.length > 0 && (
          <div className="search-results">
            {search_results.map(displayResult(playMedia))}
          </div>
        )}
      </div>
      <div className="tools">
        <div onClick={scan}>Scan</div>
        <Icon icon={faGear} size="lg" />
      </div>
    </div>
  );
};

const triggerScan = async () => axios.get("/media/scan");

const displayResult = (handler) => (file) => {
  const [primary, secondary] = file.displayAs;

  return (
    <div className="result" onClick={handler(file)}>
      {primary}
      {secondary !== undefined && <div className="secondary">{secondary}</div>}
    </div>
  );
};
