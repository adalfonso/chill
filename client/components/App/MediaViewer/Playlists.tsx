import { useDispatch } from "react-redux";
import { useLocation } from "wouter-preact";
import { useContext, useRef } from "preact/hooks";

import "./MusicLibrary.scss";
import { AppContext } from "@client/state/AppState";
import { PenIcon } from "@client/components/ui/icons/PenIcon";
import { PlayCircleIcon } from "@client/components/ui/icons/PlayCircleIcon";
import { PlayMode } from "@reducers/player.types";
import { PlaylistWithCount, Raw } from "@common/types";
import { api } from "@client/client";
import { DEFAULT_LIMIT, DEFAULT_PAGE, paginate } from "@common/pagination";
import { play } from "@reducers/player";
import { useInfiniteScroll } from "@hooks/index";
import { getPlaylistTracks } from "@client/lib/PlayerTools";

export const Playlists = () => {
  const observedElement = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch();
  const [, navigate] = useLocation();

  const { is_busy } = useContext(AppContext);

  const loadPlaylists = (page: number) => {
    is_busy.value = true;

    return api.playlist.index
      .query({ options: paginate({ page }) })
      .finally(() => (is_busy.value = false));
  };

  const { items: playlists } = useInfiniteScroll<Raw<PlaylistWithCount>>({
    onScroll: loadPlaylists,
    observedElement,
    options: { root: null, rootMargin: "0px", threshold: 1.0 },
    dependencies: [],
  });

  const playPlaylist = (playlist: Raw<PlaylistWithCount>) => async () => {
    try {
      const playlist_id = playlist.id;
      const tracks = await getPlaylistTracks({ playlist_id });

      // TODO: cast info?

      const play_options = {
        id: playlist_id,
        mode: PlayMode.UserPlaylist,
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
        more: true,
      };

      dispatch(play({ tracks, play_options, index: 0 }));
    } catch (e) {
      console.error("Failed to play playlist", (e as Error)?.message);
    }
  };

  const editPlaylist = (playlist: Raw<PlaylistWithCount>) => async () => {
    navigate(`/playlist/${playlist.id}`);
  };

  return (
    <div id="media-viewer">
      <div className="playlists-view">
        <div className="info">
          <h2>Playlists</h2>
        </div>

        <div className="panel-list playlists">
          <div className="row">
            <div>
              <strong>Name</strong>
            </div>
            <div>
              <strong>Tracks</strong>
            </div>
            <div></div>
            <div></div>
          </div>
          {playlists.map((playlist) => (
            <div className="row" key={playlist.id}>
              <div>{playlist.title}</div>
              <div>{playlist.track_count}</div>
              <div>
                <div className="play-button" onClick={playPlaylist(playlist)}>
                  <PlayCircleIcon />
                  Play
                </div>
              </div>
              <div>
                <div className="edit" onClick={editPlaylist(playlist)}>
                  <PenIcon className="icon-xs" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div id="page-bottom-boundary" ref={observedElement}></div>
      </div>
    </div>
  );
};
