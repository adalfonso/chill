import { Playlist } from "@prisma/client";
import { useEffect, useState } from "preact/hooks";

import { PlayableTrack, PlayMode, Raw } from "@common/types";
import { PlaylistRow } from "./Playlist/PlaylistRow";
import { SmartScroller } from "./SmartScroller";
import { api } from "@client/client";
import { DEFAULT_LIMIT } from "@common/pagination";
import { getPlaylistTracks } from "@client/lib/TrackLoaders";
import { usePlay } from "@hooks/index";

type PlaylistViewerProps = {
  playlist_id: number;
};

export const PlaylistViewer = ({ playlist_id }: PlaylistViewerProps) => {
  const [playlist, setPlaylist] = useState<Raw<Playlist>>();
  const play = usePlay();

  const playAll =
    (index = 0) =>
    async () => {
      const nominal_index = index + 1;
      const remainder = nominal_index % DEFAULT_LIMIT;
      const page = (nominal_index - remainder) / DEFAULT_LIMIT;
      const initial_limit = (page + 1) * DEFAULT_LIMIT;

      const tracks = await getPlaylistTracks(
        { playlist_id },
        { limit: initial_limit },
      );

      // todo cast info?

      play({
        tracks,
        index,
        play_options: {
          mode: PlayMode.UserPlaylist,
          id: playlist_id,
          limit: DEFAULT_LIMIT,
          page,
          more: true,
        },
      });
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
        key={`${index} - ${track.id}`}
      ></PlaylistRow>
    ));
