import { useSelector } from "react-redux";
import { useLocation } from "wouter-preact";

import { Equalizer } from "@client/components/ui/Equalizer";
import { FileMenu, FileMenuHandler } from "../FileMenu";
import { PlayableTrack } from "@common/types";
import { artistAlbumUrl, artistUrl } from "@client/lib/Url";
import { getPlayerState } from "@reducers/store";
import { getPlayPayload } from "@client/state/reducers/player";
import { noPropagate } from "@client/lib/Event";
import { screen_breakpoint_px } from "@client/lib/constants";
import { secondsToMinutes } from "@client/lib/AudioProgress";
import { useBackNavigate, useId, useMenu, useViewport } from "@hooks/index";

type PlaylistRowProps = {
  track: PlayableTrack;
  index: number;
  playAll: (index: number) => () => void;
};

export const PlaylistRow = ({ track, index, playAll }: PlaylistRowProps) => {
  const player = useSelector(getPlayerState);
  const menu_id = useId();
  const menu = useMenu(menu_id);
  const [, navigate] = useLocation();
  const { width } = useViewport();

  const is_mobile = width < screen_breakpoint_px;

  const { artist_id, album_id, album_art_filename } = track;

  // Minimize the context menu on back navigation
  useBackNavigate(
    () => is_mobile && menu.is_active,
    menu.clear,
  );

  const menuHandler: FileMenuHandler = {
    play: () => playAll(index)(),
    getTracks: getPlayPayload(player.is_casting, [track]),
    getTrackIds: async () => [track.id],
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
            src={`/api/v1/media/cover/${album_art_filename}?size=48`}
            loading="lazy"
          />
        )}
      </div>
      <div className="artist-track">
        <div>{track.artist}</div>
        <div className="playlist-item-title">{track.title}</div>
      </div>
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
