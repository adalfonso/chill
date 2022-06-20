import React from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { RootState } from "@client/state/reducers/store";
import { faShuffle } from "@fortawesome/free-solid-svg-icons";
import { shuffle } from "@client/state/reducers/playerReducer";
import { useDispatch, useSelector } from "react-redux";

export const Shuffle = () => {
  const player = useSelector((state: RootState) => state.player);
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
