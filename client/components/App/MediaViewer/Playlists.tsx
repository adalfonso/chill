import "./MusicLibrary.scss";
import React, { useReducer, useRef } from "react";
import _ from "lodash";
import { Playlist } from "@common/autogen";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { fetchReducer, useFetch } from "@client/hooks/useFetch";
import { pageReducer, useInfiniteScroll } from "@hooks/useInfiniteScroll";

interface MusicLibraryProps {
  setLoading: (loading: boolean) => void;
  per_page: number;
}

export const Playlists = ({ setLoading, per_page }: MusicLibraryProps) => {
  const bottomBoundaryRef = useRef(null);
  const [pager, pagerDispatch] = useReducer(pageReducer, { page: 0 });
  const [playlistData, playlistDispatch] = useReducer(fetchReducer<Playlist>, {
    items: [],
    busy: true,
  });

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

  return (
    <div id="media-viewer">
      <div className="playlists">
        <h1>Playlists</h1>
        {playlistData.items.map((playlist) => (
          <div className="playlist-item" key={playlist._id.toString()}>
            {playlist.name} - {playlist.items.length} items
          </div>
        ))}
        <div id="page-bottom-boundary" ref={bottomBoundaryRef}></div>
      </div>
    </div>
  );
};
