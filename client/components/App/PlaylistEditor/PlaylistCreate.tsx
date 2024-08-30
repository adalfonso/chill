import { useState } from "preact/hooks";
import { useSelector } from "react-redux";

import { getState } from "@reducers/store";
import { api } from "@client/client";

type PlaylistCreateProps = {
  onDone: () => void;
};

export const PlaylistCreate = ({ onDone }: PlaylistCreateProps) => {
  const [playlist_title, setPlaylistTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { playlistEditor } = useSelector(getState);

  const submit = () => {
    if (busy) {
      return;
    }

    setBusy(true);

    api.playlist.create
      .mutate({
        title: playlist_title,
        track_ids: playlistEditor.track_ids.map((item) => item.id),
      })
      .then(onDone)
      .catch(({ message }) => message && setError(message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      {error && <div className="ui-error">{error}</div>}

      <input
        type="text"
        placeholder="Playlist Title"
        onChange={(e) => {
          const { value } = e.currentTarget;
          setPlaylistTitle(value);
        }}
      />
      <button onClick={submit}>Create</button>
    </>
  );
};
