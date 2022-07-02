import React, { useState, FormEvent } from "react";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { getState } from "@reducers/store";
import { useSelector } from "react-redux";

interface PlaylistCreateProps {
  onDone: () => void;
}

export const PlaylistCreate = ({ onDone }: PlaylistCreateProps) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { playlistEditor } = useSelector(getState);

  const onInputChange = (e: FormEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    setInput(value);
  };

  const submit = () => {
    if (busy) {
      return;
    }

    setBusy(true);

    const items = playlistEditor.items.map((item) => item._id.toString());

    PlaylistApi.create(input, items)
      .then(onDone)
      .catch((err) => {
        if (err?.response?.data === undefined) {
          return;
        }

        setError(err.response.data);
      })

      .finally(() => setBusy(false));
  };

  return (
    <>
      {error && <div className="ui-error">{error}</div>}

      <input type="text" placeholder="Playlist Name" onChange={onInputChange} />
      <button onClick={submit}>Create</button>
    </>
  );
};
