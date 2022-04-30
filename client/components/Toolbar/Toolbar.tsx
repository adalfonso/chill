import "./Toolbar.scss";
import * as React from "react";
import axios from "axios";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
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
      setSearchResults([]);
      return;
    }
    const results = await MediaApi.search(value);

    setSearchResults(results.data);
  };

  const playFile = (file: Media) => () => {
    setQuery("");
    setSearchResults([]);
    onPlay([file]);
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
                  {result.artist} - {result.title}
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
