import { Equalizer } from "@client/components/ui/Equalizer";
import { FileMenu } from "../FileMenu";
import { Media } from "@common/models/Media";
import { albumUrl, artistUrl } from "@client/lib/url";
import { getState } from "@reducers/store";
import { noPropagate, secondsToMinutes } from "@client/lib/util";
import { useId } from "@hooks/useObjectId";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export interface PlaylistRowProps {
  file: Media;
  index: number;
  playAll: (index: number) => () => void;
}

export const PlaylistRow = ({ file, index, playAll }: PlaylistRowProps) => {
  const { player } = useSelector(getState);
  const menu_id = useId();
  const navigate = useNavigate();

  const menuHandler = {
    play: () => playAll(index)(),
    getFiles: () => Promise.resolve([file]),
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
      <div>
        <div className="duration mono">{secondsToMinutes(file.duration)}</div>
      </div>
      <div className="tail">
        <FileMenu
          menu_id={menu_id}
          title={`${file.artist} - ${file.title}`}
          handler={menuHandler}
        >
          <div onClick={noPropagate(() => navigate(artistUrl(file)))}>
            Go to Artist
          </div>

          <div onClick={noPropagate(() => navigate(albumUrl(file)))}>
            Go to Album
          </div>
        </FileMenu>
      </div>
    </div>
  );
};
