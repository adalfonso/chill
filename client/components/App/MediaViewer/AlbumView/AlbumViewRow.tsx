import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "wouter-preact";

import { Equalizer } from "@client/components/ui/Equalizer";
import { FileInfo } from "../FileInfo";
import { FileMenu, FileMenuHandler } from "../FileMenu";
import { PlayableTrack } from "@common/types";
import { artistUrl } from "@client/lib/url";
import { getPlayPayload } from "@client/state/reducers/player";
import { getState } from "@reducers/store";
import { noPropagate, secondsToMinutes } from "@client/lib/util";
import { screen_breakpoint_px } from "@client/lib/constants";
import { setMenu } from "@client/state/reducers/mediaMenu";
import { useBackNavigate, useId, useMenu, useViewport } from "@hooks/index";

type AlbumViewRowProps = {
  track: PlayableTrack;
  index: number;
  playAll: (index: number) => () => void;
};

export const AlbumViewRow = ({ track, index, playAll }: AlbumViewRowProps) => {
  const { player, mediaMenu } = useSelector(getState);
  const file_menu_id = useId();
  const file_info_id = useId();
  const file_info_menu = useMenu(file_info_id);
  const [, navigate] = useLocation();
  const dispatch = useDispatch();
  const { width } = useViewport();

  const { artist_id } = track;

  const is_mobile = width < screen_breakpoint_px;
  const menu_visible = mediaMenu.menu_id === file_menu_id;

  // Minimize the context menu on back navigation
  useBackNavigate(
    () => is_mobile && menu_visible,
    () => dispatch(setMenu(null)),
  );

  const menuHandler: FileMenuHandler = {
    play: () => {
      dispatch(setMenu(null));

      // Fixes race condition where the player opens before this menu closes
      setTimeout(() => playAll(index)(), 20);
    },
    getTracks: getPlayPayload(player.is_casting, [track]),
  };

  return (
    <div className="row" onClick={playAll(index)} key={track.path}>
      <div className="track">
        {track.number}
        {player.now_playing?.path === track.path && player.is_playing && (
          <Equalizer />
        )}
      </div>
      <div>{track.title}</div>
      <div>
        <div className="duration mono">{secondsToMinutes(track.duration)}</div>
      </div>
      <div className="tail">
        <FileMenu
          menu_id={file_menu_id}
          title={`${track?.artist} - ${track.title}`}
          handler={menuHandler}
        >
          <>
            {artist_id && (
              <div onClick={noPropagate(() => navigate(artistUrl(artist_id)))}>
                Go to Artist
              </div>
            )}
          </>
          <div onClick={noPropagate(file_info_menu.toggle)}>
            File Information
          </div>
        </FileMenu>
        {file_info_menu.is_active && (
          <FileInfo menu_id={file_info_id} file={track}></FileInfo>
        )}
      </div>
    </div>
  );
};
