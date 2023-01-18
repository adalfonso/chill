import "./MusicLibrary.scss";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Playlist } from "@common/models/Playlist";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { faPlayCircle, faPen } from "@fortawesome/free-solid-svg-icons";
import { fetchReducer, useFetch } from "@client/hooks/useFetch";
import { pageReducer, useInfiniteScroll } from "@hooks/useInfiniteScroll";
import { play } from "@reducers/player";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { useReducer, useRef } from "react";

interface PlaylistsProps {
  setLoading: (loading: boolean) => void;
  per_page: number;
}

export const Playlists = ({ setLoading, per_page }: PlaylistsProps) => {
  const bottomBoundaryRef = useRef(null);
  const [pager, pagerDispatch] = useReducer(pageReducer, { page: 0 });
  const [playlistData, playlistDispatch] = useReducer(fetchReducer<Playlist>, {
    items: [],
    busy: true,
  });
  const dispatch = useDispatch();
  const history = useHistory();

  const loadPlaylists = () => {
    setLoading(true);

    return PlaylistApi.index({ page: pager.page, limit: per_page });
  };

  useInfiniteScroll(bottomBoundaryRef, pagerDispatch);

  useFetch<Playlist>(
    pager,
    playlistDispatch,
    () => loadPlaylists().then((res) => res.data),
    () => setLoading(false),
  );

  const playPlaylist = (playlist: Playlist) => async () => {
    try {
      const files = await PlaylistApi.tracks(playlist._id.toString());

      dispatch(play({ files: [...files.data], index: 0 }));
    } catch (e) {}
  };

  const editPlaylist = (playlist: Playlist) => async () => {
    history.push(`/playlist/${playlist._id}`);
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
