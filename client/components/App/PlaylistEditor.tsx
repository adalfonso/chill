import "./PlaylistEditor.scss";
import React, { useState } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Radio } from "../ui/Radio";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { toggle } from "@reducers/playlistEditor";
import { useDispatch } from "react-redux";

interface PlaylistEditorProps {}

const options = [
  { name: "Add to Existing", value: "existing" },
  { name: "Add to New", value: "new" },
];

const default_mode = "existing";

export const PlaylistEditor = ({}: PlaylistEditorProps) => {
  const [selected_option, setSelectedOption] = useState(default_mode);
  const dispatch = useDispatch();

  const onPlaylistTypeChange = (value: string) => {
    setSelectedOption(value);
  };

  const close = () => dispatch(toggle());

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

        {selected_option === "existing" && (
          <div className="existing">
            <input type="text" placeholder="Search" />
          </div>
        )}
        {selected_option === "new" && (
          <div className="new">
            <input type="text" placeholder="Playlist Name" />
            <button>Create</button>
          </div>
        )}
      </div>
    </div>
  );
};
