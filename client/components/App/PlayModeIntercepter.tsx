import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";

import { PlayMode } from "@reducers/player.types";
import { PlayableTrack } from "@common/types";
import { addToQueue, PlayerState, updatePlayOptions } from "@reducers/player";
import { api } from "@client/client";
import { getRandomTracks } from "@client/lib/PlayerTools";
import { getState } from "@reducers/store";
import { paginate } from "@common/pagination";

type PlayModeIterceptorProps = {
  children?: JSX.Element | JSX.Element[];
};

export const PlayModeIterceptor = ({ children }: PlayModeIterceptorProps) => {
  const [busy, setBusy] = useState(false);
  const { player } = useSelector(getState);
  const dispatch = useDispatch();

  const queueMoreTracks = async (getTracks: () => Promise<PlayableTrack[]>) => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const tracks = await getTracks();

      const cast_info = player.is_casting
        ? await api.track.castInfo.query({
            track_ids: tracks.map((track) => track.id),
          })
        : null;

      dispatch(addToQueue({ tracks, cast_info }));

      if (player.play_options.mode === PlayMode.Playlist) {
        dispatch(
          updatePlayOptions({
            ...player.play_options,
            page: player.play_options.page + 1,
            complete: tracks.length === 0,
          }),
        );
      } else if (player.play_options.mode === PlayMode.Random) {
        dispatch(
          updatePlayOptions({
            ...player.play_options,
            complete: tracks.length === 0,
          }),
        );
      }
    } catch (e) {
      console.error(
        `Failed to add more ${player.play_options.mode} tracks:`,
        e,
      );
    }

    setBusy(false);
  };

  const next_batch_offset = 6;

  const { complete } = player.play_options;

  if (!complete && player.playlist.length - player.index < next_batch_offset) {
    switch (player.play_options.mode) {
      case PlayMode.Random:
        queueMoreTracks(getMoreRandomTracks(player));
        break;
      case PlayMode.Playlist:
        queueMoreTracks(getMorePlaylistTracks(player));
        break;
      default:
    }
  }

  return <>{children}</>;
};

const getMoreRandomTracks = (player: PlayerState) => async () => {
  // Appease TypeScript
  if (player.play_options.mode !== PlayMode.Random) {
    return [];
  }

  const exclusions = player.playlist.map((file) => file.id);
  const { tracks } = await getRandomTracks(player.is_casting, exclusions);

  return tracks;
};

const getMorePlaylistTracks = (player: PlayerState) => async () => {
  const { play_options } = player;

  // Appease TypeScript
  if (play_options.mode !== PlayMode.Playlist) {
    return [];
  }

  const { id, page, limit } = play_options;

  return api.playlist.tracks.query({
    id,
    options: paginate({ page: page + 1, limit }),
  });
};
