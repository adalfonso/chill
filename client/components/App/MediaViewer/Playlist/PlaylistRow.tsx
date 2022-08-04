import React, { useState } from "react";
import { FileMenu } from "../FileMenu";
import { Media } from "@common/autogen";
import { secondsToMinutes } from "@client/util";

export interface PlaylistRowProps {
  file: Media;
  index: number;
  playAll: (index: number) => () => void;
}

export const PlaylistRow = ({ file, index, playAll }: PlaylistRowProps) => {
  const [menu_visible, setMenuVisible] = useState(false);

  const menuHandler = {
    play: () => playAll(index)(),
    getFiles: () => Promise.resolve([file]),
    toggle: setMenuVisible,
  };

  return (
    <div className="row">
      <div>{index + 1}</div>
      <div>
        {file.cover?.filename && (
          <img
            src={`/media/cover/${file.cover.filename}?size=36`}
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
