import { useSignal } from "@preact/signals";
import { useState } from "preact/hooks";

import * as playlistEditor from "@client/state/playlistEditorStore";
import { PlaylistWithCount, Raw } from "@common/types";
import { api } from "@client/client";

type PlaylistUpdateProps = {
  onDone: () => void;
};

export const PlaylistUpdate = ({ onDone }: PlaylistUpdateProps) => {
  const [_input, setInput] = useState("");
  const is_busy = useSignal(false);

  const [results, setResults] = useState<Array<Raw<PlaylistWithCount>>>([]);
  const [selected, setSelected] = useState<Raw<PlaylistWithCount>>();
  const submit = (selected: Raw<PlaylistWithCount>) => () => {
    if (is_busy.value) {
      return;
    }

    is_busy.value = true;
    const track_ids = playlistEditor.track_ids.value;

    api.playlist.update
      .mutate({ id: selected.id, track_ids: track_ids })
      .then(onDone)
      .catch()
      .finally(() => (is_busy.value = false));
  };

  const search = (value: string) => {
    setInput(value);

    if (is_busy.value) {
      return;
    }

    is_busy.value = true;
    api.playlist.search
      .query({ query: value })
      .then(setResults)
      .catch(({ message }) =>
        console.error("Failed to search playlist:", message),
      )
      .finally(() => (is_busy.value = false));
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
            {playlistEditor.track_ids.value.length} new)
          </div>
          <button onClick={submit(selected)}>Update</button>
        </>
      )}
    </div>
  );
};
