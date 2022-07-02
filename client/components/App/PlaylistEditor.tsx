import "./PlaylistEditor.scss";
import React, { useState, FormEvent } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { Radio } from "../ui/Radio";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { getState } from "@reducers/store";
import { toggle } from "@reducers/playlistEditor";
import { useDispatch, useSelector } from "react-redux";

interface PlaylistEditorProps {}

const options = [
  { name: "Add to Existing", value: "existing" },
  { name: "Create New", value: "new" },
];

const default_mode = "existing";

export const PlaylistEditor = ({}: PlaylistEditorProps) => {
  const [input_value, setInputValue] = useState("");
  const [selected_option, setSelectedOption] = useState(default_mode);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const { playlistEditor } = useSelector(getState);

  const placeholder = selected_option === "new" ? "Playlist Name" : "Search";

  const onPlaylistTypeChange = (value: string) => {
    setSelectedOption(value);
  };

  const close = () => dispatch(toggle());

  const onInputChange = (e: FormEvent<HTMLInputElement>) => {
    setInputValue(e.currentTarget.value);
    setError("");
  };

  const createPlaylist = () => {
    PlaylistApi.create(
      input_value,
      playlistEditor.files.map((file) => file._id.toString()),
    )
      .then(() => close())
      .catch((err) => {
        if (err?.response?.data === undefined) {
          return;
        }

        setError(err.response.data);
      });
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

        {selected_option === "new" && (
          <button onClick={createPlaylist}>Create</button>
        )}
      </div>
    </div>
  );
};
