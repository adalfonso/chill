import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faShuffle } from "@fortawesome/free-solid-svg-icons";
import { getState } from "@reducers/store";
import { shuffle } from "@reducers/player";
import { useDispatch, useSelector } from "react-redux";

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
