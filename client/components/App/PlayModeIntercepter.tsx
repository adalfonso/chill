import type { JSX } from "preact";
import { useSignal } from "@preact/signals";

import { PlayMode, PlayableTrack } from "@common/types";
import { api } from "@client/client";
import { getMoreTracks } from "@client/lib/TrackLoaders";
import * as playerStore from "@client/state/playerStore";
import { useAddToQueue } from "@hooks/useAddToQueue";
import { useAppState } from "@hooks/index";

type PlayModeIterceptorProps = {
  children?: JSX.Element | JSX.Element[];
};

export const PlayModeIterceptor = ({ children }: PlayModeIterceptorProps) => {
  const { outgoing_connection } = useAppState();
  const is_busy = useSignal(false);
  const addToQueue = useAddToQueue();
  const is_source = Boolean(outgoing_connection.value);

  const queueMoreTracks = async (
    getTracks: () => Promise<Array<PlayableTrack>>,
  ) => {
    // Source should not queue more; target will handle
    if (is_busy.value || is_source) {
      return;
    }

    is_busy.value = true;
    try {
      const tracks = await getTracks();

      const cast_info = playerStore.is_casting.value
        ? await api.track.castInfo.query({
            track_ids: tracks.map((track) => track.id),
          })
        : null;

      addToQueue({ tracks, cast_info });

      if (playerStore.play_options.value.mode === PlayMode.Random) {
        playerStore.updatePlayOptions({
          ...playerStore.play_options.value,
          more: tracks.length > 0,
        });
        // All other modes
      } else if (playerStore.play_options.value.mode !== PlayMode.None) {
        playerStore.updatePlayOptions({
          ...playerStore.play_options.value,
          page: playerStore.play_options.value.page + 1,
          more: tracks.length > 0,
        });
      }
    } catch (e) {
      console.error(
        `Failed to add more ${playerStore.play_options.value.mode} tracks:`,
        e,
      );
    }

    is_busy.value = false;
  };

  const next_batch_offset = 6;

  const { more } = playerStore.play_options.value;

  const should_queue_more =
    playerStore.playlist.value.length - playerStore.index.value <
    next_batch_offset;

  if (more && should_queue_more) {
    queueMoreTracks(async () =>
      getMoreTracks({
        play_options: playerStore.play_options.value,
        playlist: playerStore.playlist.value,
      }),
    );
  }

  return <>{children}</>;
};
