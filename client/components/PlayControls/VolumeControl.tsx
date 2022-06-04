import "./VolumeControl.scss";
import React from "react";
import { RootState } from "@client/state/reducers/store";
import { changeVolume } from "@client/state/reducers/playerReducer";
import { useDispatch, useSelector } from "react-redux";
import { useDrag } from "@client/hooks/useDrag";

export const VolumeControl = () => {
  const player = useSelector((state: RootState) => state.player);
  const dispatch = useDispatch();

  const { startDrag, cancelDrag, updateDrag } = useDrag((percent: number) =>
    dispatch(changeVolume({ percent })),
  );

  return (
    <div className="volume-control">
      <div
        className="phantom"
        onMouseDown={startDrag}
        onMouseUp={cancelDrag}
        onMouseLeave={cancelDrag}
        onMouseMove={updateDrag}
      ></div>
      <div
        className="volume-level"
        style={{
          width: `${player.volume * 100}%`,
        }}
      ></div>
    </div>
  );
};
