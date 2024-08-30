import { Playlist } from "@prisma/client";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "preact/hooks";

import "./MusicLibrary.scss";
import { PlayableTrack, Raw } from "@common/types";
import { PlaylistRow } from "./Playlist/PlaylistRow";
import { SmartScroller } from "./SmartScroller";
import { api } from "@client/client";
import { paginate } from "@common/pagination";
import { pagination_limit } from "@client/lib/constants";
import { play } from "@reducers/player";

type PlaylistViewerProps = {
  playlist_id: number;
};

export const PlaylistViewer = ({ playlist_id }: PlaylistViewerProps) => {
  const [playlist, setPlaylist] = useState<Raw<Playlist>>();
  const dispatch = useDispatch();

  const playAll =
    (index = 0) =>
    async () => {
      // XXX: make this paginated
      const tracks = await api.playlist.tracks.query({
        id: playlist_id,
        options: paginate({ page: 0, limit: 9999 }),
      });

      dispatch(play({ tracks, index }));
    };

  useEffect(() => {
    api.playlist.get.query({ id: playlist_id }).then(setPlaylist);
  }, [playlist_id]);

  const loadPlaylistTracks = (page: number) =>
    api.playlist.tracks.query({
      id: playlist_id,
      options: paginate({ page, limit: pagination_limit }),
    });

  return (
    <>
      {playlist && (
        <SmartScroller
          className="playlist-viewer"
          header={playlist?.title}
          dependencies={[playlist?.title ?? ""]}
          onScroll={loadPlaylistTracks}
          wrapperClassName="playlist-tracks panel-list"
          makeItems={makePlaylistRows(playAll)}
        ></SmartScroller>
      )}
    </>
  );
};

const makePlaylistRows =
  (playAll: (index?: number) => () => void) => (tracks: Array<PlayableTrack>) =>
    tracks.map((track, index) => (
      <PlaylistRow
        index={index}
        track={track}
        playAll={playAll}
        key={track.id}
      ></PlaylistRow>
    ));
