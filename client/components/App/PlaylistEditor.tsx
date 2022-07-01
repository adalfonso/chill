import "./PlaylistEditor.scss";
import React, { MouseEvent, useState } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { Radio } from "../ui/Radio";

interface PlaylistEditorProps {
  onClose: (e: MouseEvent<SVGElement>) => void;
}

const options = [
  { name: "Add to Existing", value: "existing" },
  { name: "Add to New", value: "new" },
];

const default_mode = "existing";

export const PlaylistEditor = ({ onClose }: PlaylistEditorProps) => {
  const [selected_option, setSelectedOption] = useState(default_mode);

  const onPlaylistTypeChange = (value: string) => {
    setSelectedOption(value);
  };

  return (
    <div className="playlist-editor">
      <div className="ui-modal">
        <div className="toolbar">
          <Icon className="close" icon={faClose} onClick={onClose} />
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
