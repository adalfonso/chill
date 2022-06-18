import React, { useState } from "react";
import { FileMenu } from "../../FileMenu";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/autogen";
import { RootState } from "@client/state/reducers/store";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { playNext, addToQueue } from "@client/state/reducers/playerReducer";
import { secondsToMinutes } from "@client/util";
import { useDispatch, useSelector } from "react-redux";

export interface AlbumViewRowProps {
  file: Media;
  index: number;
  playAll: (index: number) => () => void;
}

export const AlbumViewRow = ({ file, index, playAll }: AlbumViewRowProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const player = useSelector((state: RootState) => state.player);
  const dispatch = useDispatch();

  const menuHandler = {
    play: () => playAll(index)(),
    playNext: () => dispatch(playNext({ files: [file] })),
    addToQueue: () => dispatch(addToQueue({ files: [file] })),
    toggle: (visible: boolean) => setShowMenu(visible),
  };

  return (
    <div className="row" onClick={playAll(index)} key={file.path}>
      <div className="track">
        {file.track}
        {player?.now_playing?.path === file.path && (
          <Icon className="play-icon" icon={faPlayCircle} pull="right" />
        )}
      </div>
      <div>{file.title}</div>
      <div className={"tail" + (showMenu ? " show-menu" : "")}>
        <div className="duration mono">{secondsToMinutes(file.duration)}</div>
        <FileMenu handler={menuHandler}></FileMenu>
      </div>
    </div>
  );
};