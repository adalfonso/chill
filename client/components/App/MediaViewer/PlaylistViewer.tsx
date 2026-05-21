import { Playlist } from "@prisma/client";
import { useEffect, useRef, useState } from "preact/hooks";

import { PlayableTrack, PlayMode, Raw } from "@common/types";
import { PlaylistRow } from "./Playlist/PlaylistRow";
import { api } from "@client/client";
import { DEFAULT_LIMIT } from "@common/pagination";
import { getPlaylistTracks } from "@client/lib/TrackLoaders";
import { useInfiniteScroll, usePlay, usePlaylistDrag } from "@hooks/index";

type PlaylistViewerProps = {
  playlist_id: number;
};

export const PlaylistViewer = ({ playlist_id }: PlaylistViewerProps) => {
  const [playlist, setPlaylist] = useState<Raw<Playlist>>();
  const [dragged_index, setDraggedIndex] = useState<number | null>(null);
  const observedElement = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const play = usePlay();

  useEffect(() => {
    api.playlist.get.query({ id: playlist_id }).then(setPlaylist);
  }, [playlist_id]);

  const { items: tracks, setItems: setTracks } =
    useInfiniteScroll<PlayableTrack>({
      onScroll: (page) => getPlaylistTracks({ playlist_id }, { page }),
      observedElement,
      options: { root: null, rootMargin: "0px", threshold: 1.0 },
      dependencies: [String(playlist_id)],
    });

  // Live ref so pointer handlers always see the latest list.
  const tracks_ref = useRef(tracks);
  tracks_ref.current = tracks;

  const playAll = makePlayAll(playlist_id, play);

  const { onPointerDown, onPointerMove, endDrag } = usePlaylistDrag({
    playlist_id,
    container,
    tracks_ref,
    setTracks,
    setDraggedIndex,
  });

  return (
    <div id="media-viewer">
      <div className="playlist-viewer wide">
        {playlist && (
          <div className="info">
            <h2>{playlist.title}</h2>
          </div>
        )}
        <div
          className="playlist-tracks panel-list"
          ref={container}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        >
          {tracks.map((track, index) => (
            <PlaylistRow
              index={index}
              track={track}
              playAll={playAll}
              key={track.id}
              dragged={dragged_index === index}
            />
          ))}
        </div>
        <div id="page-bottom-boundary" ref={observedElement}></div>
      </div>
    </div>
  );
};

const makePlayAll =
  (playlist_id: number, play: ReturnType<typeof usePlay>) =>
  (index = 0) =>
  async () => {
    const nominal_index = index + 1;
    const remainder = nominal_index % DEFAULT_LIMIT;
    const page = (nominal_index - remainder) / DEFAULT_LIMIT;
    const initial_limit = (page + 1) * DEFAULT_LIMIT;

    const playback_tracks = await getPlaylistTracks(
      { playlist_id },
      { limit: initial_limit },
    );

    play({
      tracks: playback_tracks,
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
