import { useSelector } from "react-redux";
import { getPlayerState } from "@reducers/store";

import { ShuffleIcon } from "@client/components/ui/icons/ShuffleIcon";
import { useShuffle } from "@hooks/index";

export const Shuffle = () => {
  const player = useSelector(getPlayerState);
  const shuffle = useShuffle();

  return (
    <ShuffleIcon
      onClick={shuffle}
      className={player.is_shuffled ? "active icon-xs" : "icon-xs"}
    />
  );
};
