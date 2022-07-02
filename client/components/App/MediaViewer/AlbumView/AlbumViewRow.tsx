import React, { useState } from "react";
import { Equalizer } from "@client/components/ui/Equalizer";
import { FileMenu } from "../FileMenu";
import { Media } from "@common/autogen";
import { RootState } from "@reducers/store";
import { playNext, addToQueue } from "@reducers/player";
import { secondsToMinutes } from "@client/util";
import { useDispatch, useSelector } from "react-redux";

export interface AlbumViewRowProps {
  file: Media;
  index: number;
  playAll: (index: number) => () => void;
}

export const AlbumViewRow = ({ file, index, playAll }: AlbumViewRowProps) => {
  const [menu_visible, setMenuVisible] = useState(false);
  const { player } = useSelector((state: RootState) => state);
  const dispatch = useDispatch();

  const menuHandler = {
    play: () => playAll(index)(),
    playNext: () => dispatch(playNext({ files: [file] })),
    addToQueue: () => dispatch(addToQueue({ files: [file] })),
    toggle: setMenuVisible,
  };

  return (
    <div className="row" onClick={playAll(index)} key={file.path}>
      <div className="track">
        {file.track}
        {player.now_playing?.path === file.path && player.is_playing && (
          <Equalizer />
        )}
      </div>
      <div>{file.title}</div>
      <div className={"tail" + (menu_visible ? " show-menu" : "")}>
        <div className="duration mono">{secondsToMinutes(file.duration)}</div>
        <FileMenu handler={menuHandler}></FileMenu>
      </div>
    </div>
  );
};
