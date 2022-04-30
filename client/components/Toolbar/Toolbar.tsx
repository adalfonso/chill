import "./Toolbar.scss";
import * as React from "react";
import axios from "axios";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { MatchMap, MediaApi } from "@client/api/MediaApi";
import { capitalize, shuffle } from "@client/util";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router-dom";
import { useState } from "react";

export const Toolbar = ({ onPlay }) => {
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [search_results, setSearchResults] = useState([]);
  const history = useHistory();
  const scan = async () => {
    if (busy) {
      return;
    }

    setBusy(true);

    await triggerScan();

    setBusy(false);
  };

  const search = async (e) => {
    const value = e.target.value.replace(/\s+/g, " ");
    setQuery(value);

    if (value === "") {
      return clear();
    }
    const results = await MediaApi.search(value);

    setSearchResults(results.data);
  };

  const playFile = (file) => async () => {
    clear();

    const { type, value } = file;

    let match: Partial<MatchMap> = {};

    if (file.type === "title") {
      match.path = value;
    } else {
      match[type] = value;
    }

    const results = (await MediaApi.query(match)).data;
    const should_shuffle = ["artist", "genre"].includes(type);

    onPlay(
      should_shuffle
        ? shuffle(results)
        : results.sort((a, b) => a.track - b.track),
    );
  };

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
            {search_results.map((result) => {
              return (
                <div className="result" onClick={playFile(result)}>
                  {result.type === "title"
                    ? ""
                    : capitalize(result.type) + ": "}
                  {result.displayAs}
                </div>
              );
            })}
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

const triggerScan = async () => {
  await axios.get("/media/scan");
};
