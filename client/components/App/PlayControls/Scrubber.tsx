import "./Scrubber.scss";
import { useState, useEffect } from "react";
import {
  audio,
  crossover,
  getAudioProgress,
  next,
  seek,
} from "@reducers/player";
import { getState } from "@reducers/store";
import { getTimeTracking, startAnimationLoop } from "@client/lib/util";
import { useDispatch, useSelector } from "react-redux";
import { useDrag } from "@hooks/useDrag";

const gap_offset = 0.25;

export const Scrubber = () => {
  const [progress, setProgress] = useState(0);
  const { player } = useSelector(getState);
  const dispatch = useDispatch();
  const { startDrag, cancelDrag, updateDrag, dragging } = useDrag(
    (percent: number) => dispatch(seek({ percent })),
  );

  // TODO: Should useEffect return a fn to break out of the loop?
  useEffect(() => {
    startAnimationLoop(() => {
      if (getAudioProgress() === progress) {
        return;
      }

      setProgress(getAudioProgress());
    });

    /**
     * We will automatically dispatch the next track when the current track has
     * 200ms or less to go. This is a hack to simulate gapless playback.
     * Additionally both the audio and the crossover audio's closure will
     * reference "audio". That's because either fixture may be playing at a
     * given time, but the only the one currently playing will be referenced as
     * "audio" due to the swapping nature of the crossover.
     */

    const onCrossover = () =>
      audio.duration - audio.currentTime < gap_offset &&
      dispatch(next({ auto: true }));

    audio.addEventListener("timeupdate", onCrossover);
    crossover.addEventListener("timeupdate", onCrossover);
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
          {player.now_playing && getTimeTracking(audio.currentTime)}
        </div>
        <div className="end-time">
          {player.now_playing &&
            !Number.isNaN(audio.duration) &&
            getTimeTracking(audio.duration)}
        </div>
      </div>
    </>
  );
};
