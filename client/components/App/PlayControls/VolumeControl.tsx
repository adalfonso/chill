import { useSelector } from "react-redux";

import "./VolumeControl.scss";
import { getPlayerState } from "@reducers/store";
import { DragOrientation, useChangeVolume, useDrag } from "@hooks/index";

export const VolumeControl = () => {
  const player = useSelector(getPlayerState);
  const changeVolume = useChangeVolume();

  const { startDrag, cancelDrag, updateDrag } = useDrag(
    DragOrientation.Horizontal,
    (percent: number) => {
      percent = Math.round(percent * 100) / 100;

      if (percent - player.volume === 0) {
        return;
      }

      changeVolume(percent);
    },
  );

  return (
    <div
      className="volume-control"
      onPointerDown={startDrag}
      onPointerUp={cancelDrag}
      onPointerLeave={cancelDrag}
      onPointerMove={updateDrag}
    >
      <div
        className="slider"
        style={{
          left: `${player.volume * 100}%`,
        }}
      ></div>
      <div className="shell"></div>
      <div
        className="volume-level"
        style={{
          width: `${player.volume * 100}%`,
        }}
      ></div>
    </div>
  );
};
