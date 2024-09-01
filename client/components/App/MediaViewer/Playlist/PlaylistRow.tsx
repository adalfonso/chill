import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "wouter-preact";

import { Equalizer } from "@client/components/ui/Equalizer";
import { FileMenu, FileMenuHandler } from "../FileMenu";
import { PlayableTrack } from "@common/types";
import { artistAlbumUrl, artistUrl } from "@client/lib/url";
import { getPlayPayload } from "@client/state/reducers/player";
import { getMediaMenuState, getPlayerState } from "@reducers/store";
import { noPropagate, secondsToMinutes } from "@client/lib/util";
import { screen_breakpoint_px } from "@client/lib/constants";
import { setMenu } from "@client/state/reducers/mediaMenu";
import { useBackNavigate } from "@hooks/index";
import { useId, useViewport } from "@hooks/index";

type PlaylistRowProps = {
  track: PlayableTrack;
  index: number;
  playAll: (index: number) => () => void;
};

export const PlaylistRow = ({ track, index, playAll }: PlaylistRowProps) => {
  const player = useSelector(getPlayerState);
  const mediaMenu = useSelector(getMediaMenuState);
  const menu_id = useId();
  const [, navigate] = useLocation();
  const dispatch = useDispatch();
  const { width } = useViewport();

  const is_mobile = width < screen_breakpoint_px;
  const menu_visible = mediaMenu.menu_id === menu_id;

  const { artist_id, album_id, album_art_filename } = track;

  // Minimize the context menu on back navigation
  useBackNavigate(
    () => is_mobile && menu_visible,
    () => dispatch(setMenu(null)),
  );

  const menuHandler: FileMenuHandler = {
    play: () => playAll(index)(),
    getTracks: getPlayPayload(player.is_casting, [track]),
  };

  return (
    <div className="row" onClick={playAll(index)}>
      <div className="track">
        {index + 1}
        {player.now_playing?.path === track.path && player.is_playing && (
          <Equalizer />
        )}
      </div>
      <div>
        {album_art_filename && (
          <img
            src={`/api/v1/media/cover/${album_art_filename}?size=36`}
            loading="lazy"
          />
        )}
      </div>
      <div>{track.title}</div>
      <div>{track.artist}</div>
      <div>
        <div className="duration mono">{secondsToMinutes(track.duration)}</div>
      </div>
      <div className="tail">
        <FileMenu
          menu_id={menu_id}
          title={`${track.artist} - ${track.title}`}
          handler={menuHandler}
        >
          <>
            {artist_id && (
              <div onClick={noPropagate(() => navigate(artistUrl(artist_id)))}>
                Go to Artist
              </div>
            )}
          </>

          <>
            {album_id && artist_id && (
              <div
                onClick={noPropagate(() =>
                  navigate(artistAlbumUrl(album_id, artist_id)),
                )}
              >
                Go to Album
              </div>
            )}
          </>
        </FileMenu>
      </div>
    </div>
  );
};
