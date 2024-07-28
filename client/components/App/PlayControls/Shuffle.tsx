import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faShuffle } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";

import { getState } from "@reducers/store";
import { shuffle } from "@reducers/player";

export const Shuffle = () => {
  const { player } = useSelector(getState);
  const dispatch = useDispatch();

  const toggleShuffle = () => dispatch(shuffle());

  return (
    <Icon
      icon={faShuffle}
      onClick={toggleShuffle}
      className={player.is_shuffled ? "active" : ""}
    />
  );
};
