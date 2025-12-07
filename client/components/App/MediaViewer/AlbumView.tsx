import { Album } from "@prisma/client";
import { useSelector } from "react-redux";
import { useState, useEffect, useCallback } from "preact/hooks";
import { useComputed, useSignal } from "@preact/signals";

import "./AlbumView.scss";
import {
  AlbumRelationalData,
  Maybe,
  PlayableTrack,
  PlayMode,
  Raw,
} from "@common/types";
import { AlbumViewRow } from "./AlbumView/AlbumViewRow";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "@common/pagination";
import { PlayCircleIcon } from "@client/components/ui/icons/PlayCircleIcon";
import { api } from "@client/client";
import { getPlayerState } from "@client/state/reducers/store";
import { getTracks, sort_clauses } from "@client/lib/TrackLoaders";
import { truncate } from "@common/commonUtils";
import { useAppState, usePlay } from "@hooks/index";

type AlbumViewProps = {
  artist_id?: number;
  album_id: number;
};

export const AlbumView = ({ album_id }: AlbumViewProps) => {
  const { is_busy } = useAppState();
  const player = useSelector(getPlayerState);
  const [album, setAlbum] =
    useState<Maybe<Raw<Album & AlbumRelationalData>>>(null);
  const tracks = useSignal<Array<PlayableTrack>>([]);
  const play = usePlay();

  const artist_names = useComputed(() =>
    new Set(tracks.value.map((track) => track.artist).filter(Boolean))
      .values()
      .toArray(),
  );

  const loadInfo = useCallback(() => {
    Promise.all(
      [
        api.album.get.query({ id: album_id }).then(setAlbum),
        getTracks(
          { album_id },
          // Make sure all tracks are loaded because we only do this once
          { sort: sort_clauses.album, limit: 999 },
        ).then((value) => (tracks.value = value)),
      ].filter(Boolean),
    ).finally(() => (is_busy.value = false));
  }, [album_id]);

  useEffect(loadInfo, [loadInfo]);

  const playAll =
    (index = 0) =>
    async () => {
      if (!tracks.value.length) {
        return;
      }

      const is_casting = player.is_casting;
      const cast_info = is_casting
        ? await api.track.castInfo.query({
            track_ids: tracks.value.map((track) => track.id),
          })
        : null;

      // TODO: incorporate artist_id in here when necessary
      const play_options = {
        mode: PlayMode.Album,
        id: album_id,
        limit: DEFAULT_LIMIT,
        page: DEFAULT_PAGE,
        more: true,
      };

      play({ tracks: [...tracks.value], cast_info, index, play_options });
    };

  const getArtistName = () => {
    return (
      // Loaded album and there are multiple artists
      (artist_names.value.length > 1 && "Various Artists") ||
      // Loaded album but there is a single artist
      album?.artist?.name ||
      // Fallback
      "Unknown Artist"
    );
  };

  const groupedByDisc = tracks.value
    .reduce((acc, track) => {
      const group = acc.get(track.disc_number) || [];
      group.push(track);

      return acc.set(track.disc_number, group);
    }, new Map<number, Array<PlayableTrack>>())
    .entries()
    .toArray()
    .sort((a, b) => a[0] - b[0])
    .map(([_key, value]) =>
      value.sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    );

  // Allows albums with multiple discs to have continuous track numbering
  let total_index = -1;

  return (
    <div id="media-viewer">
      <div className="album-view wide">
        <div className="details">
          <div className="album-art">
            {album?.album_art?.filename && (
              <img
                src={`/api/v1/media/cover/${album?.album_art?.filename}?size=160`}
                loading="lazy"
              />
            )}
          </div>

          <div className="info">
            <h2>{getArtistName()}</h2>
            {artist_names.value.length > 1 && (
              <h4 title={artist_names.value.values().toArray().join(",  ")}>
                {truncate(artist_names.value.values().toArray().join(",  "), {
                  length: 72,
                })}
              </h4>
            )}
            <h4>{truncate(album?.title ?? "", { length: 50 })}</h4>
            <h4>{album?.year || ""}</h4>
            <div className="play-button" onClick={() => playAll()()}>
              <PlayCircleIcon className="icon-xxs" />
              Play
            </div>
          </div>
        </div>

        <div className="panel-list">
          <div className="header track"></div>
          <div className="header"></div>
          <div className="header"></div>
          <div className="header align-right"></div>

          {groupedByDisc.map((group) =>
            group
              .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
              .map((track, index) => {
                total_index++;

                return (
                  <>
                    {groupedByDisc.length > 1 && index === 0 && (
                      <div
                        className="row row-disc-separator"
                        key={`disc-${track.disc_number}`}
                      >
                        <div>Disc {track.disc_number}</div>
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                    )}
                    <AlbumViewRow
                      index={total_index}
                      track={track}
                      playAll={playAll}
                      key={track.id}
                    />
                  </>
                );
              }),
          )}
        </div>
      </div>
    </div>
  );
};
