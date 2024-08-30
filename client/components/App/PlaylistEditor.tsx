import { useDispatch } from "react-redux";
import { useState } from "preact/hooks";

import "./PlaylistEditor.scss";
import { Close } from "../ui/Close";
import { PlaylistCreate } from "./PlaylistEditor/PlaylistCreate";
import { PlaylistUpdate } from "./PlaylistEditor/PlaylistUpdate";
import { Radio } from "../ui/Radio";
import { toggle } from "@reducers/playlistEditor";

const modes = [
  { name: "Create New", value: "new" },
  { name: "Add to Existing", value: "existing" },
];

const default_mode = "new";

export const PlaylistEditor = () => {
  const [mode, setMode] = useState(default_mode);
  const dispatch = useDispatch();
  const onPlaylistTypeChange = (value: string) => setMode(value);
  const onClose = () => dispatch(toggle({ track_ids: [] }));

  return (
    <div className="playlist-editor">
      <div className="ui-modal">
        <div className="toolbar">
          <Close onClose={onClose} />
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
