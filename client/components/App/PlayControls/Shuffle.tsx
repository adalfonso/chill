import { useSelector } from "react-redux";
import { getPlayerState } from "@reducers/store";

import { ShuffleIcon } from "@client/components/ui/icons/ShuffleIcon";
import { useShuffle } from "@hooks/index";
import { PlayMode } from "@common/types";

export const Shuffle = () => {
  const player = useSelector(getPlayerState);
  const shuffle = useShuffle();
  const disabled = player.play_options.mode === PlayMode.Random;

  const className =
    "icon-xs" +
    (disabled ? " disabled" : player.is_shuffled ? " active" : "") +
    "";

  return (
    <ShuffleIcon onClick={() => !disabled && shuffle()} className={className} />
  );
};
