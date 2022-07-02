import React, { useState, FormEvent } from "react";
import { Playlist } from "@common/autogen";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { getState } from "@reducers/store";
import { useSelector } from "react-redux";

interface PlaylistUpdateProps {
  onDone: () => void;
}

export const PlaylistUpdate = ({ onDone }: PlaylistUpdateProps) => {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Playlist[]>([]);
  const [selected, setSelected] = useState<Playlist>();
  const { playlistEditor } = useSelector(getState);

  const submit = () => {
    if (busy) {
      return;
    }

    setBusy(true);

    const files = playlistEditor.files.map((file) => file._id.toString());

    PlaylistApi.update(selected._id.toString(), files)
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

    PlaylistApi.search(value)
      .then((res) => setResults(res.data))
      .catch((_) => {})
      .finally(() => setBusy(false));
  };

  const choosePlaylist = (playlist) => () => {
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
            key={result._id.toString()}
            onClick={choosePlaylist(result)}
          >
            {result.name}
          </div>
        ))}
      </div>

      {selected && (
        <>
          <div className="selected-playlist">
            {selected.name} - {selected.items.length} items (+
            {playlistEditor.files.length} new)
          </div>
          <button onClick={submit}>Update</button>
        </>
      )}
    </div>
  );
};
