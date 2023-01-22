import { Equalizer } from "@client/components/ui/Equalizer";
import { FileMenu } from "../FileMenu";
import { Media } from "@common/models/Media";
import { ObjectID } from "bson";
import { artistUrl } from "@client/lib/url";
import { getState } from "@reducers/store";
import { secondsToMinutes } from "@client/util";
import { useNavigate } from "react-router-dom";
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
          <div
            // TODO: Find a less repetitive way to stop propagation
            onClick={(e) => {
              e.stopPropagation();
              navigate(artistUrl(file));
            }}
          >
            Go to Artist ({file.artist})
          </div>
        </FileMenu>
      </div>
    </div>
  );
};
