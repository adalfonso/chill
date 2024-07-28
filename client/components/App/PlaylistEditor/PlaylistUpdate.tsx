import { useSelector } from "react-redux";
import { useState, FormEvent } from "react";

import { api } from "@client/client";
import { getState } from "@reducers/store";
import { PlaylistWithCount } from "@common/types";

type PlaylistUpdateProps = {
  onDone: () => void;
};

export const PlaylistUpdate = ({ onDone }: PlaylistUpdateProps) => {
  const [_input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Array<PlaylistWithCount>>([]);
  const [selected, setSelected] = useState<PlaylistWithCount>();
  const { playlistEditor } = useSelector(getState);

  const submit = (selected: PlaylistWithCount) => () => {
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

  const search = (e: FormEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
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

  const choosePlaylist = (playlist: PlaylistWithCount) => () => {
    setSelected(playlist);
    setResults([]);
  };

  return (
    <div className="search">
      <input type="text" placeholder="Search" onChange={search} />

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
