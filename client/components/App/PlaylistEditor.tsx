import "./PlaylistEditor.scss";
import React, { useState, FormEvent } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Playlist } from "@common/autogen";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { Radio } from "../ui/Radio";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { getState } from "@reducers/store";
import { toggle } from "@reducers/playlistEditor";
import { useDispatch, useSelector } from "react-redux";

interface PlaylistEditorProps {}

const options = [
  { name: "Create New", value: "new" },
  { name: "Add to Existing", value: "existing" },
];

const default_mode = "new";

export const PlaylistEditor = ({}: PlaylistEditorProps) => {
  const [input_value, setInputValue] = useState("");
  const [mode, setMode] = useState(default_mode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search_results, setSearchResults] = useState<Playlist[]>([]);
  const [selected_playlist, setSelectedPlaylist] = useState<Playlist>();
  const dispatch = useDispatch();
  const { playlistEditor } = useSelector(getState);

  const placeholder = mode === "new" ? "Playlist Name" : "Search";

  const onPlaylistTypeChange = (value: string) => {
    setMode(value);
  };

  const close = () => dispatch(toggle());

  const onInputChange = (e: FormEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    setInputValue(value);
    setError("");

    if (mode === "new") {
      return;
    }

    queryPlaylist(value);
  };

  const submit = () => {
    if (busy) {
      return;
    }

    setBusy(true);

    const files = playlistEditor.files.map((file) => file._id.toString());

    const action =
      mode == "new"
        ? createPlaylist(input_value, files)
        : addToExisting(selected_playlist._id.toString(), files);

    action
      .then(() => close())
      .catch()
      .finally(() => setBusy(false));
  };

  const createPlaylist = (name: string, files: string[]) =>
    PlaylistApi.create(name, files).catch((err) => {
      if (err?.response?.data === undefined) {
        return;
      }

      setError(err.response.data);
    });

  const addToExisting = (id: string, files: string[]) =>
    PlaylistApi.update(id, files);

  const queryPlaylist = (input: string) => {
    if (busy) {
      return;
    }

    setBusy(true);

    PlaylistApi.search(input)
      .then((res) => setSearchResults(res.data))
      .catch((_) => {})
      .finally(() => setBusy(false));
  };

  const choosePlaylist = (playlist) => () => {
    setSelectedPlaylist(playlist);
    setSearchResults([]);
  };

  return (
    <div className="playlist-editor">
      <div className="ui-modal">
        <div className="toolbar">
          <Icon className="close" icon={faClose} onClick={close} />
        </div>
        <h1>Add to playlist</h1>
        <Radio
          default_value={default_mode}
          options={options}
          onChange={onPlaylistTypeChange}
        />

        {error && <div className="ui-error">{error}</div>}

        <input type="text" placeholder={placeholder} onChange={onInputChange} />

        {search_results.map((result) => {
          return (
            <div key={result._id.toString()} onClick={choosePlaylist(result)}>
              {result.name}
            </div>
          );
        })}

        {selected_playlist && <div>{selected_playlist.name}</div>}

        {(mode === "new" || selected_playlist) && (
          <button onClick={submit}>Create</button>
        )}
      </div>
    </div>
  );
};
