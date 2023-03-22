import "./VolumeControl.scss";
import { changeVolume } from "@reducers/player";
import { getState } from "@reducers/store";
import { useDispatch, useSelector } from "react-redux";
import { useDrag } from "@hooks/useDrag";

export const VolumeControl = () => {
  const { player } = useSelector(getState);
  const dispatch = useDispatch();

  const { startDrag, cancelDrag, updateDrag } = useDrag((percent: number) => {
    percent = Math.round(percent * 100) / 100;

    if (percent - player.volume === 0) {
      return;
    }

    dispatch(changeVolume(percent));
  });

  return (
    <div
      className="volume-control"
      onMouseDown={startDrag}
      onMouseUp={cancelDrag}
      onMouseLeave={cancelDrag}
      onMouseMove={updateDrag}
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
