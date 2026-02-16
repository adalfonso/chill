import "./VolumeControl.scss";
import * as playerStore from "@client/state/playerStore";
import { DragOrientation, useChangeVolume, useDrag } from "@hooks/index";

export const VolumeControl = () => {
  const changeVolume = useChangeVolume();

  const { startDrag, cancelDrag, updateDrag } = useDrag(
    DragOrientation.Horizontal,
    (percent: number) => {
      percent = Math.round(percent * 100) / 100;

      if (percent - playerStore.volume.value === 0) {
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
          left: `${playerStore.volume.value * 100}%`,
        }}
      ></div>
      <div className="shell"></div>
      <div
        className="volume-level"
        style={{
          width: `${playerStore.volume.value * 100}%`,
        }}
      ></div>
    </div>
  );
};
