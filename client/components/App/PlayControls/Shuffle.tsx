import { useDispatch, useSelector } from "react-redux";

import { getPlayerState } from "@reducers/store";
import { shuffle } from "@reducers/player";
import { ShuffleIcon } from "@client/components/ui/icons/ShuffleIcon";

export const Shuffle = () => {
  const player = useSelector(getPlayerState);
  const dispatch = useDispatch();

  const toggleShuffle = () => dispatch(shuffle());

  return (
    <ShuffleIcon
      onClick={toggleShuffle}
      className={player.is_shuffled ? "active icon-xs" : "icon-xs"}
    />
  );
};
