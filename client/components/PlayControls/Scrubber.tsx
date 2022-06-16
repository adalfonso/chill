import "./Scrubber.scss";
import React, { useState, useEffect } from "react";
import { RootState } from "@client/state/reducers/store";
import { getTimeTracking, startAnimationLoop } from "@client/util";
import { useDispatch, useSelector } from "react-redux";
import { useDrag } from "@client/hooks/useDrag";
import {
  audio,
  getAudioProgress,
  next,
  seek,
} from "@client/state/reducers/playerReducer";

export const Scrubber = () => {
  const [progress, setProgress] = useState(0);
  const player = useSelector((state: RootState) => state.player);
  const dispatch = useDispatch();
  const { startDrag, cancelDrag, updateDrag, dragging } = useDrag(
    (percent: number) => dispatch(seek({ percent })),
  );

  useEffect(() => {
    startAnimationLoop(() => {
      if (getAudioProgress() === progress) {
        return;
      }

      setProgress(getAudioProgress());
    });

    audio.addEventListener("ended", () => {
      dispatch(next({ auto: true }));
    });
  }, []);

  return (
    <>
      <div
        className="scrubber-container"
        onMouseDown={startDrag}
        onMouseUp={cancelDrag}
        onMouseLeave={cancelDrag}
        onMouseMove={updateDrag}
        onTouchStart={startDrag}
        onTouchEnd={cancelDrag}
        onTouchCancel={cancelDrag}
        onTouchMove={updateDrag}
      >
        <div className="scrubber" style={{ width: `${progress}%` }}></div>
        <div
          className={"slider" + (dragging ? " visible" : "")}
          style={{ left: `${progress}%` }}
        ></div>
      </div>

      <div className="time-tracking">
        <div className="current-time">
          {player.is_playing && getTimeTracking(audio.currentTime)}
        </div>
        <div className="end-time">
          {player.is_playing && getTimeTracking(audio.duration)}
        </div>
      </div>
    </>
  );
};
