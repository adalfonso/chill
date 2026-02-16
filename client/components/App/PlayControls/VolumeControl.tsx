import "./VolumeControl.scss";
import * as player from "@client/state/playerStore";
import { DragOrientation, useChangeVolume, useDrag } from "@hooks/index";

export const VolumeControl = () => {
  const changeVolume = useChangeVolume();

  const { startDrag, cancelDrag, updateDrag } = useDrag(
    DragOrientation.Horizontal,
    (percent: number) => {
      percent = Math.round(percent * 100) / 100;

      if (percent - player.volume.value === 0) {
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
          left: `${player.volume.value * 100}%`,
        }}
      ></div>
      <div className="shell"></div>
      <div
        className="volume-level"
        style={{
          width: `${player.volume.value * 100}%`,
        }}
      ></div>
    </div>
  );
};
