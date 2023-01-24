import { Equalizer } from "@client/components/ui/Equalizer";
import { FileInfo } from "../FileInfo";
import { FileMenu } from "../FileMenu";
import { Media } from "@common/models/Media";
import { ObjectID } from "bson";
import { artistUrl } from "@client/lib/url";
import { getState } from "@reducers/store";
import { noPropagate, secondsToMinutes } from "@client/util";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { useMenu } from "@hooks/useMenu";

export interface AlbumViewRowProps {
  file: Media;
  index: number;
  playAll: (index: number) => () => void;
}

export const AlbumViewRow = ({ file, index, playAll }: AlbumViewRowProps) => {
  const { player } = useSelector(getState);
  const menu_id = useRef(new ObjectID().toString());
  const file_info_id = useRef(new ObjectID().toString());
  const file_info_menu = useMenu(file_info_id.current);
  const navigate = useNavigate();

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
        >
          <div onClick={noPropagate(() => navigate(artistUrl(file)))}>
            Go to Artist
          </div>
          <div onClick={noPropagate(file_info_menu.toggle)}>
            File Information
          </div>
        </FileMenu>
        {file_info_menu.is_active && (
          <FileInfo menu_id={file_info_id.current} file={file}></FileInfo>
        )}
      </div>
    </div>
  );
};
