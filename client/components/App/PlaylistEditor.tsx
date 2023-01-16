import "./PlaylistEditor.scss";
import { useState } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { PlaylistCreate } from "./PlaylistEditor/PlaylistCreate";
import { PlaylistUpdate } from "./PlaylistEditor/PlaylistUpdate";
import { Radio } from "../ui/Radio";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { toggle } from "@reducers/playlistEditor";
import { useDispatch } from "react-redux";

const modes = [
  { name: "Create New", value: "new" },
  { name: "Add to Existing", value: "existing" },
];

const default_mode = "new";

export const PlaylistEditor = () => {
  const [mode, setMode] = useState(default_mode);
  const dispatch = useDispatch();
  const onPlaylistTypeChange = (value: string) => setMode(value);
  const onClose = () => dispatch(toggle());

  return (
    <div className="playlist-editor">
      <div className="ui-modal">
        <div className="toolbar">
          <Icon className="close" icon={faClose} onClick={onClose} />
        </div>
        <h1>Add to playlist</h1>
        <Radio
          default_value={default_mode}
          options={modes}
          onChange={onPlaylistTypeChange}
        />

        {mode === "new" && <PlaylistCreate onDone={onClose} />}
        {mode === "existing" && <PlaylistUpdate onDone={onClose} />}
      </div>
    </div>
  );
};
