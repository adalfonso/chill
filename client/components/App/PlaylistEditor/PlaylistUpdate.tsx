import { Playlist } from "@common/models/Playlist";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { getState } from "@reducers/store";
import { useSelector } from "react-redux";
import { useState, FormEvent } from "react";

interface PlaylistUpdateProps {
  onDone: () => void;
}

export const PlaylistUpdate = ({ onDone }: PlaylistUpdateProps) => {
  const [_input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Playlist[]>([]);
  const [selected, setSelected] = useState<Playlist>();
  const { playlistEditor } = useSelector(getState);

  const submit = (selected: Playlist) => () => {
    if (busy) {
      return;
    }

    setBusy(true);

    const items = playlistEditor.items.map((item) => item._id.toString());

    PlaylistApi.update(selected._id.toString(), items)
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
      .then(setResults)
      .catch(({ message }) =>
        console.error("Failed to search playlist:", message),
      )
      .finally(() => setBusy(false));
  };

  const choosePlaylist = (playlist: Playlist) => () => {
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
            {playlistEditor.items.length} new)
          </div>
          <button onClick={submit(selected)}>Update</button>
        </>
      )}
    </div>
  );
};
