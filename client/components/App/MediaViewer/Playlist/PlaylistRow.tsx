import { Equalizer } from "@client/components/ui/Equalizer";
import { FileMenu, FileMenuHandler } from "../FileMenu";
import { Media } from "@common/models/Media";
import { albumUrl, artistUrl } from "@client/lib/url";
import { getPlayPayload } from "@client/state/reducers/player";
import { getState } from "@reducers/store";
import { noPropagate, secondsToMinutes } from "@client/lib/util";
import { useId } from "@hooks/useObjectId";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useBackNavigate } from "@client/hooks/useBackNavigate";
import { setMenu } from "@client/state/reducers/mediaMenu";
import { screen_breakpoint_px } from "@client/lib/constants";
import { useViewport } from "@client/hooks/useViewport";

export interface PlaylistRowProps {
  file: Media;
  index: number;
  playAll: (index: number) => () => void;
}

export const PlaylistRow = ({ file, index, playAll }: PlaylistRowProps) => {
  const { player, mediaMenu } = useSelector(getState);
  const menu_id = useId();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { width } = useViewport();

  const is_mobile = width < screen_breakpoint_px;
  const menu_visible = mediaMenu.menu_id === menu_id;

  // Minimize the context menu on back navigation
  useBackNavigate(
    () => is_mobile && menu_visible,
    () => dispatch(setMenu(null)),
  );

  const menuHandler: FileMenuHandler = {
    play: () => playAll(index)(),

    getFiles: getPlayPayload(player.is_casting, [file]),
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
