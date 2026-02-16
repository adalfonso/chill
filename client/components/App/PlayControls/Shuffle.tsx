import * as playerStore from "@client/state/playerStore";

import { ShuffleIcon } from "@client/components/ui/icons/ShuffleIcon";
import { useShuffle } from "@hooks/index";
import { PlayMode } from "@common/types";

export const Shuffle = () => {
  const shuffle = useShuffle();
  const disabled = playerStore.play_options.value.mode === PlayMode.Random;

  const className =
    "icon-xs" +
    (disabled ? " disabled" : playerStore.is_shuffled.value ? " active" : "") +
    "";

  return (
    <ShuffleIcon onClick={() => !disabled && shuffle()} className={className} />
  );
};
