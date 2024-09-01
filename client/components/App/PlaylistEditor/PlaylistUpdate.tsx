import { useSelector } from "react-redux";
import { useState } from "preact/hooks";

import { PlaylistWithCount, Raw } from "@common/types";
import { api } from "@client/client";
import { getPlaylistEditorState } from "@reducers/store";

type PlaylistUpdateProps = {
  onDone: () => void;
};

export const PlaylistUpdate = ({ onDone }: PlaylistUpdateProps) => {
  const [_input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Array<Raw<PlaylistWithCount>>>([]);
  const [selected, setSelected] = useState<Raw<PlaylistWithCount>>();
  const playlistEditor = useSelector(getPlaylistEditorState);

  const submit = (selected: Raw<PlaylistWithCount>) => () => {
    if (busy) {
      return;
    }

    setBusy(true);

    const track_ids = playlistEditor.track_ids.map((item) => item.id);

    api.playlist.update
      .mutate({ id: selected.id, track_ids: track_ids })
      .then(onDone)
      .catch()
      .finally(() => setBusy(false));
  };

  const search = (value: string) => {
    setInput(value);

    if (busy) {
      return;
    }

    setBusy(true);

    api.playlist.search
      .query({ query: value })
      .then(setResults)
      .catch(({ message }) =>
        console.error("Failed to search playlist:", message),
      )
      .finally(() => setBusy(false));
  };

  const choosePlaylist = (playlist: Raw<PlaylistWithCount>) => () => {
    setSelected(playlist);
    setResults([]);
  };

  return (
    <div className="search">
      <input
        type="text"
        placeholder="Search"
        onChange={(e) => search(e.currentTarget.value)}
      />

      <div className="search-results">
        {results.map((result) => (
          <div
            className="result"
            key={result.id}
            onClick={choosePlaylist(result)}
          >
            {result.title}
          </div>
        ))}
      </div>

      {selected && (
        <>
          <div className="selected-playlist">
            {selected.title} - {selected.track_count} items (+
            {playlistEditor.track_ids.length} new)
          </div>
          <button onClick={submit(selected)}>Update</button>
        </>
      )}
    </div>
  );
};
