import React, { useState } from "react";
import { Equalizer } from "@client/components/ui/Equalizer";
import { FileMenu } from "../FileMenu";
import { Media } from "@common/autogen";
import { getState } from "@reducers/store";
import { secondsToMinutes } from "@client/util";
import { useSelector } from "react-redux";

export interface PlaylistRowProps {
  file: Media;
  index: number;
  playAll: (index: number) => () => void;
}

export const PlaylistRow = ({ file, index, playAll }: PlaylistRowProps) => {
  const [menu_visible, setMenuVisible] = useState(false);
  const { player } = useSelector(getState);

  const menuHandler = {
    play: () => playAll(index)(),
    getFiles: () => Promise.resolve([file]),
    toggle: setMenuVisible,
  };

  return (
    <div className="row" onClick={playAll(index)}>
      <div className="track">
        {index + 1}
        {player.now_playing?.path === file.path && player.is_playing && (
          <Equalizer />
        )}
      </div>
      <div>
        {file.cover?.filename && (
          <img
            src={`/api/v1/media/cover/${file.cover.filename}?size=36`}
            loading="lazy"
          />
        )}
      </div>
      <div>{file.title}</div>
      <div>{file.artist}</div>
      <div className={"tail" + (menu_visible ? " show-menu" : "")}>
        <div className="duration mono">{secondsToMinutes(file.duration)}</div>
        <FileMenu handler={menuHandler}></FileMenu>
      </div>
    </div>
  );
};
