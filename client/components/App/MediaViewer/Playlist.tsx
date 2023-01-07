import "./MusicLibrary.scss";
import { useEffect, useState } from "react";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { PlaylistObject } from "@common/autogen";
import { PlaylistRow } from "./Playlist/PlaylistRow";
import { play } from "@reducers/player";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";

interface PlaylistProps {}

type PlaylistParams = {
  id: string;
};

export const Playlist = ({}: PlaylistProps) => {
  const id = decodeURIComponent(useParams<PlaylistParams>().id);
  const [files, setFiles] = useState([]);
  const [playlist, setPlaylist] = useState<PlaylistObject>();
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
        <h1>{playlist?.name}</h1>

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
