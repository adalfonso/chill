import type { JSX } from "preact";
import { useSignal } from "@preact/signals";

import * as player from "@client/state/playerStore";
import { PlayMode, PlayableTrack } from "@common/types";
import { api } from "@client/client";
import { getMoreTracks } from "@client/lib/TrackLoaders";
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

      const cast_info = player.is_casting.value
        ? await api.track.castInfo.query({
            track_ids: tracks.map((track) => track.id),
          })
        : null;

      addToQueue({ tracks, cast_info });

      if (player.play_options.value.mode === PlayMode.Random) {
        player.updatePlayOptions({
          ...player.play_options.value,
          more: tracks.length > 0,
        });
        // All other modes
      } else if (player.play_options.value.mode !== PlayMode.None) {
        player.updatePlayOptions({
          ...player.play_options.value,
          page: player.play_options.value.page + 1,
          more: tracks.length > 0,
        });
      }
    } catch (e) {
      console.error(
        `Failed to add more ${player.play_options.value.mode} tracks:`,
        e,
      );
    }

    is_busy.value = false;
  };

  const next_batch_offset = 6;

  const { more } = player.play_options.value;

  const should_queue_more =
    player.playlist.value.length - player.index.value < next_batch_offset;

  if (more && should_queue_more) {
    queueMoreTracks(async () =>
      getMoreTracks({
        play_options: player.play_options.value,
        playlist: player.playlist.value,
      }),
    );
  }

  return <>{children}</>;
};
