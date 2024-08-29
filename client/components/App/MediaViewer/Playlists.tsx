import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useContext, useRef } from "react";

import "./MusicLibrary.scss";
import { AppContext } from "@client/state/AppState";
import { PenIcon } from "@client/components/ui/icons/PenIcon";
import { PlayCircleIcon } from "@client/components/ui/icons/PlayCircleIcon";
import { PlayMode } from "@reducers/player.types";
import { PlaylistWithCount } from "@common/types";
import { api } from "@client/client";
import { paginate } from "@common/pagination";
import { pagination_limit } from "@client/lib/constants";
import { play } from "@reducers/player";
import { useInfiniteScroll } from "@hooks/index";

type PlaylistsProps = {
  per_page: number;
};

export const Playlists = ({ per_page }: PlaylistsProps) => {
  const observedElement = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { is_busy } = useContext(AppContext);

  const loadPlaylists = (page: number) => {
    is_busy.value = true;

    return api.playlist.index
      .query({ options: paginate({ page, limit: per_page }) })
      .finally(() => (is_busy.value = false));
  };

  const { items: playlists } = useInfiniteScroll<PlaylistWithCount>({
    onScroll: loadPlaylists,
    observedElement,
    options: { root: null, rootMargin: "0px", threshold: 1.0 },
    dependencies: [],
  });

  const playPlaylist = (playlist: PlaylistWithCount) => async () => {
    try {
      const playlist_id = playlist.id;
      const pagination_options = paginate({ page: 0, limit: pagination_limit });
      const tracks = await api.playlist.tracks.query({
        id: playlist_id,
        options: pagination_options,
      });

      const play_options = {
        id: playlist_id,
        mode: PlayMode.Playlist,
        ...pagination_options,
        complete: false,
      };

      dispatch(play({ tracks, play_options, index: 0 }));
    } catch (e) {
      console.error("Failed to play playlist", (e as Error)?.message);
    }
  };

  const editPlaylist = (playlist: PlaylistWithCount) => async () => {
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
