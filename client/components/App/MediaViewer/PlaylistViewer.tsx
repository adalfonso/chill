import "./MusicLibrary.scss";
import { Playlist as PlaylistClass } from "@common/models/Playlist";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { PlaylistRow } from "./Playlist/PlaylistRow";
import { play } from "@reducers/player";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type PlaylistParams = {
  id: string;
};

export const PlaylistViewer = () => {
  const id = decodeURIComponent(useParams<PlaylistParams>().id);
  const [files, setFiles] = useState([]);
  const [playlist, setPlaylist] = useState<PlaylistClass>();
  const dispatch = useDispatch();

  const playAll =
    (index = 0) =>
    () => {
      dispatch(play({ files: [...files], index }));
    };

  useEffect(() => {
    Promise.all([PlaylistApi.read(id), PlaylistApi.tracks(id)]).then(
      ([playlist, files]) => {
        setPlaylist(playlist.data);
        setFiles(files.data);
      },
    );
  }, [id]);

  return (
    <div id="media-viewer">
      <div className="playlist-viewer">
        <div className="info">
          <h2>{playlist?.name}</h2>
        </div>

        <div className="playlist-tracks panel-list">
          {files?.map((file, index) => (
            <PlaylistRow
              index={index}
              file={file}
              playAll={playAll}
              key={file._id.toString()}
            ></PlaylistRow>
          ))}
        </div>
      </div>
    </div>
  );
};
