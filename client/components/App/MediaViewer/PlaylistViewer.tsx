import { Playlist } from "@prisma/client";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "preact/hooks";

import "./MusicLibrary.scss";
import { PlayableTrack, Raw } from "@common/types";
import { PlaylistRow } from "./Playlist/PlaylistRow";
import { SmartScroller } from "./SmartScroller";
import { api } from "@client/client";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "@common/pagination";
import { play } from "@reducers/player";
import { PlayMode } from "@reducers/player.types";
import { getPlaylistTracks } from "@client/lib/TrackLoaders";

type PlaylistViewerProps = {
  playlist_id: number;
};

export const PlaylistViewer = ({ playlist_id }: PlaylistViewerProps) => {
  const [playlist, setPlaylist] = useState<Raw<Playlist>>();
  const dispatch = useDispatch();

  const playAll =
    (index = 0) =>
    async () => {
      const tracks = await getPlaylistTracks({ playlist_id });

      // todo cast info?

      dispatch(
        play({
          tracks,
          index,
          play_options: {
            mode: PlayMode.UserPlaylist,
            id: playlist_id,
            limit: DEFAULT_LIMIT,
            page: DEFAULT_PAGE,
            more: true,
          },
        }),
      );
    };

  useEffect(() => {
    api.playlist.get.query({ id: playlist_id }).then(setPlaylist);
  }, [playlist_id]);

  const loadPlaylistTracks = (page: number) =>
    getPlaylistTracks({ playlist_id }, { page });

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
