import { useDispatch, useSelector } from "react-redux";
import { useState } from "preact/hooks";

import { PlayMode, PlayableTrack } from "@common/types";
import { api } from "@client/client";
import { getMoreTracks } from "@client/lib/TrackLoaders";
import { getPlayerState } from "@reducers/store";
import { updatePlayOptions } from "@reducers/player";
import { useAddToQueue } from "@hooks/useAddToQueue";
import { useAppState } from "@hooks/index";

type PlayModeIterceptorProps = {
  children?: JSX.Element | JSX.Element[];
};

export const PlayModeIterceptor = ({ children }: PlayModeIterceptorProps) => {
  const { outgoing_connection } = useAppState();
  const [busy, setBusy] = useState(false);
  const addToQueue = useAddToQueue();
  const player = useSelector(getPlayerState);
  const dispatch = useDispatch();
  const is_source = Boolean(outgoing_connection.value);

  const queueMoreTracks = async (
    getTracks: () => Promise<Array<PlayableTrack>>,
  ) => {
    // Source should not queue more; target will handle
    if (busy || is_source) {
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

      addToQueue({ tracks, cast_info });

      if (player.play_options.mode === PlayMode.Random) {
        dispatch(
          updatePlayOptions({
            ...player.play_options,
            more: tracks.length > 0,
          }),
        );
        // All other modes
      } else if (player.play_options.mode !== PlayMode.None) {
        dispatch(
          updatePlayOptions({
            ...player.play_options,
            page: player.play_options.page + 1,
            more: tracks.length > 0,
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

  const { more } = player.play_options;

  const should_queue_more =
    player.playlist.length - player.index < next_batch_offset;

  if (more && should_queue_more) {
    queueMoreTracks(async () => getMoreTracks(player));
  }

  return <>{children}</>;
};
