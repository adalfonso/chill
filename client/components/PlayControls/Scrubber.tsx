import "./Scrubber.scss";
import React, { useState, useEffect } from "react";
import { startAnimationLoop } from "@client/util";
import { useDispatch } from "react-redux";
import { useDrag } from "@client/hooks/useDrag";
import {
  audio,
  getAudioProgress,
  next,
  seek,
} from "@client/state/reducers/playerReducer";

export const Scrubber = () => {
  const [progress, setProgress] = useState(0);
  const dispatch = useDispatch();
  const { startDrag, cancelDrag, updateDrag } = useDrag((percent: number) =>
    dispatch(seek({ percent })),
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
    <div className="scrubber-container">
      <div
        className="phantom"
        onMouseDown={startDrag}
        onMouseUp={cancelDrag}
        onMouseLeave={cancelDrag}
        onMouseMove={updateDrag}
      ></div>
      <div
        className="scrubber"
        style={{
          width: `${progress}%`,
        }}
      ></div>
    </div>
  );
};
