import "./Scrubber.scss";
import React, { useState, useEffect } from "react";
import { startAnimationLoop } from "@client/util";
import { useDispatch } from "react-redux";
import {
  audio,
  getAudioProgress,
  next,
  seek,
} from "@client/state/reducers/playerReducer";

export const Scrubber = () => {
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [progress_override, setProgressOverride] = useState<number>();
  const dispatch = useDispatch();

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

  const releaseScrubber = async (e: React.MouseEvent<HTMLElement>) => {
    if (!dragging || !(e.target instanceof HTMLElement)) {
      return;
    }

    dispatch(seek({ percent: calculateXPos(e.target, e.clientX) }));
    cancelDrag();
  };

  const adjustDrag = (e: React.MouseEvent<HTMLElement>) => {
    if (!dragging || !(e.target instanceof HTMLElement)) {
      return;
    }

    setProgressOverride(calculateXPos(e.target, e.clientX) * 100);
  };

  const cancelDrag = () => {
    setDragging(false);
    setProgressOverride(undefined);
  };

  return (
    <div className="scrubber-container">
      <div
        className="phantom"
        onMouseDown={() => setDragging(true)}
        onMouseUp={releaseScrubber}
        onMouseLeave={cancelDrag}
        onMouseMove={adjustDrag}
      ></div>
      <div
        className="scrubber"
        style={{
          width: `${
            progress_override !== undefined ? progress_override : progress
          }%`,
        }}
      ></div>
    </div>
  );
};

const calculateXPos = (element: HTMLElement, offset: number) => {
  const rect = element.getBoundingClientRect();
  const x = offset - rect.left;
  return x / rect.right;
};
