import "./MusicLibrary.scss";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { PlayMode } from "@reducers/player.types";
import { Playlist } from "@common/models/Playlist";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { faPlayCircle, faPen } from "@fortawesome/free-solid-svg-icons";
import { pagination_limit } from "@client/lib/constants";
import { play } from "@reducers/player";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useReducer, useRef } from "react";
import {
  pageReducer,
  useInfiniteScroll,
  fetchReducer,
  useFetch,
} from "@hooks/index";

interface PlaylistsProps {
  setLoading: (loading: boolean) => void;
  per_page: number;
}

export const Playlists = ({ setLoading, per_page }: PlaylistsProps) => {
  const bottomBoundaryRef = useRef<HTMLDivElement>(null);
  const [pager, pagerDispatch] = useReducer(pageReducer, { page: 0 });
  const [playlistData, playlistDispatch] = useReducer(fetchReducer<Playlist>, {
    items: [],
    busy: true,
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const loadPlaylists = () => {
    setLoading(true);

    return PlaylistApi.index({ page: pager.page, limit: per_page });
  };

  useInfiniteScroll(bottomBoundaryRef, pagerDispatch);

  useFetch<Playlist>({
    pager,
    dispatch: playlistDispatch,
    onFetch: loadPlaylists,
    onDone: () => setLoading(false),
  });

  const playPlaylist = (playlist: Playlist) => async () => {
    try {
      const playlist_id = playlist._id.toString();
      const pagination_options = { page: 0, limit: pagination_limit };
      const files = await PlaylistApi.tracks(playlist_id, pagination_options);

      const play_options = {
        id: playlist_id,
        mode: PlayMode.Playlist,
        ...pagination_options,
        complete: false,
      };

      dispatch(play({ files, play_options, index: 0 }));
    } catch ({ message }) {
      console.error("Failed to play playlist", message);
    }
  };

  const editPlaylist = (playlist: Playlist) => async () => {
    navigate(`/playlist/${playlist._id}`);
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
          {playlistData.items.map((playlist) => (
            <div className="row" key={playlist._id.toString()}>
              <div>{playlist.name}</div>
              <div>{playlist.items.length}</div>
              <div>
                <div className="play-button" onClick={playPlaylist(playlist)}>
                  <Icon icon={faPlayCircle} size="sm" pull="right" />
                  Play
                </div>
              </div>
              <div>
                <div className="edit" onClick={editPlaylist(playlist)}>
                  <Icon icon={faPen} size="sm" pull="right" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div id="page-bottom-boundary" ref={bottomBoundaryRef}></div>
      </div>
    </div>
  );
};
