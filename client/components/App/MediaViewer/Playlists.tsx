import { useLocation } from "wouter-preact";
import { useRef } from "preact/hooks";

import { DEFAULT_LIMIT, DEFAULT_PAGE, paginate } from "@common/pagination";
import { PenIcon } from "@client/components/ui/icons/PenIcon";
import { PlayCircleIcon } from "@client/components/ui/icons/PlayCircleIcon";
import { PlaylistWithCount, PlayMode, Raw } from "@common/types";
import { api } from "@client/client";
import { getPlaylistTracks } from "@client/lib/TrackLoaders";
import { useAppState, useInfiniteScroll, usePlay } from "@hooks/index";

export const Playlists = () => {
  const { is_loading } = useAppState();
  const observedElement = useRef<HTMLDivElement>(null);
  const play = usePlay();
  const [, navigate] = useLocation();

  const loadPlaylists = (page: number) => {
    is_loading.value = true;

    return api.playlist.index
      .query({ options: paginate({ page }) })
      .finally(() => (is_loading.value = false));
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

      play({ tracks, play_options, index: 0 });
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
