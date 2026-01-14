import { useState } from "preact/hooks";
import { useSelector } from "react-redux";
import { useSignal } from "@preact/signals";

import { api } from "@client/client";
import { getPlaylistEditorState } from "@reducers/store";

type PlaylistCreateProps = {
  onDone: () => void;
};

export const PlaylistCreate = ({ onDone }: PlaylistCreateProps) => {
  const is_busy = useSignal(false);
  const [playlist_title, setPlaylistTitle] = useState("");
  const [error, setError] = useState("");

  const playlistEditor = useSelector(getPlaylistEditorState);

  const submit = () => {
    if (is_busy.value) {
      return;
    }

    is_busy.value = true;
    api.playlist.create
      .mutate({
        title: playlist_title,
        track_ids: playlistEditor.track_ids,
      })
      .then(onDone)
      .catch(({ message }) => message && setError(message))
      .finally(() => (is_busy.value = false));
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
