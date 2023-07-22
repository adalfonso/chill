import { Equalizer } from "@client/components/ui/Equalizer";
import { FileInfo } from "../FileInfo";
import { FileMenu, FileMenuHandler } from "../FileMenu";
import { Media } from "@common/models/Media";
import { artistUrl } from "@client/lib/url";
import { getPlayPayload } from "@client/state/reducers/player";
import { getState } from "@reducers/store";
import { noPropagate, secondsToMinutes } from "@client/lib/util";
import { screen_breakpoint_px } from "@client/lib/constants";
import { setMenu } from "@client/state/reducers/mediaMenu";
import { useBackNavigate } from "@client/hooks/useBackNavigate";
import { useDispatch, useSelector } from "react-redux";
import { useId } from "@hooks/useObjectId";
import { useMenu } from "@hooks/useMenu";
import { useNavigate } from "react-router-dom";
import { useViewport } from "@client/hooks/useViewport";

export interface AlbumViewRowProps {
  file: Media;
  index: number;
  playAll: (index: number) => () => void;
}

export const AlbumViewRow = ({ file, index, playAll }: AlbumViewRowProps) => {
  const { player, mediaMenu } = useSelector(getState);
  const file_menu_id = useId();
  const file_info_id = useId();
  const file_info_menu = useMenu(file_info_id);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { width } = useViewport();

  const is_mobile = width < screen_breakpoint_px;
  const menu_visible = mediaMenu.menu_id === file_menu_id;

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
          menu_id={file_menu_id}
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
          <FileInfo menu_id={file_info_id} file={file}></FileInfo>
        )}
      </div>
    </div>
  );
};
