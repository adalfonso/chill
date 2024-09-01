import { useDispatch, useSelector } from "react-redux";
import { useState } from "preact/hooks";

import { PlayMode } from "@reducers/player.types";
import { PlayableTrack } from "@common/types";
import { addToQueue, updatePlayOptions } from "@reducers/player";
import { api } from "@client/client";
import { getMoreTracks } from "@client/lib/PlayerTools";
import { getState } from "@reducers/store";

type PlayModeIterceptorProps = {
  children?: JSX.Element | JSX.Element[];
};

export const PlayModeIterceptor = ({ children }: PlayModeIterceptorProps) => {
  const [busy, setBusy] = useState(false);
  const { player } = useSelector(getState);
  const dispatch = useDispatch();

  const queueMoreTracks = async (
    getTracks: () => Promise<Array<PlayableTrack>>,
  ) => {
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
