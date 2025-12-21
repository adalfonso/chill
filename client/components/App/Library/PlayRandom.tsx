import { useSelector } from "react-redux";

import { PlayMode } from "@common/types";
import { ShuffleIcon } from "@client/components/ui/icons/ShuffleIcon";
import { api } from "@client/client";
import { getPlayerState } from "@reducers/store";
import { getRandomTracks } from "@client/lib/TrackLoaders";
import { usePlay } from "@hooks/usePlay";

export const PlayRandom = () => {
  const player = useSelector(getPlayerState);
  const play = usePlay();

  const playRandomTracks = async () => {
    const tracks = await getRandomTracks();

    const cast_info = player.is_casting
      ? await api.track.castInfo.query({
          track_ids: tracks.map((file) => file.id),
        })
      : null;

    const play_options = { mode: PlayMode.Random, more: true };

    play({ tracks, play_options, cast_info, index: 0 });
  };

  return (
    <div className="play-random" onClick={playRandomTracks}>
      <ShuffleIcon className="icon-sm" />
    </div>
  );
};
