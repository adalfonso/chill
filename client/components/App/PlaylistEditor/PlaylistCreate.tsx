import { useSignal } from "@preact/signals";
import { useState } from "preact/hooks";

import * as playlistEditor from "@client/state/playlistEditorStore";
import { api } from "@client/client";

type PlaylistCreateProps = {
  onDone: () => void;
};

export const PlaylistCreate = ({ onDone }: PlaylistCreateProps) => {
  const is_busy = useSignal(false);
  const [playlist_title, setPlaylistTitle] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (is_busy.value) {
      return;
    }

    is_busy.value = true;
    api.playlist.create
      .mutate({
        title: playlist_title,
        track_ids: playlistEditor.track_ids.value,
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
