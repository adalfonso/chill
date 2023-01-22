import { Equalizer } from "@client/components/ui/Equalizer";
import { FileMenu } from "../FileMenu";
import { Media } from "@common/models/Media";
import { ObjectID } from "bson";
import { getState } from "@reducers/store";
import { secondsToMinutes } from "@client/util";
import { useRef } from "react";
import { useSelector } from "react-redux";
export interface AlbumViewRowProps {
  file: Media;
  index: number;
  playAll: (index: number) => () => void;
}

export const AlbumViewRow = ({ file, index, playAll }: AlbumViewRowProps) => {
  const { player } = useSelector(getState);
  const menu_id = useRef(new ObjectID().toString());

  const menuHandler = {
    play: () => playAll(index)(),
    getFiles: () => Promise.resolve([file]),
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
      <div>
        <div className="duration mono">{secondsToMinutes(file.duration)}</div>
      </div>
      <div className="tail">
        <FileMenu
          menu_id={menu_id.current}
          title={`${file.artist} - ${file.title}`}
          handler={menuHandler}
        ></FileMenu>
      </div>
    </div>
  );
};
