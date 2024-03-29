import "./Scrubber.scss";
import { getState } from "@reducers/store";
import {
  cancelAllAnimationFrames,
  getTimeTracking,
  startAnimationLoop,
} from "@client/lib/util";
import { useDispatch, useSelector } from "react-redux";
import { useDrag } from "@hooks/index";
import { useState, useEffect, useRef } from "react";
import {
  audio,
  crossover,
  getAudioProgress,
  next,
  seek,
  setAudioProgress,
} from "@reducers/player";

const gap_offset = 0.25;

export const Scrubber = () => {
  const [progress, setProgress] = useState(0);
  const { player } = useSelector(getState);
  const dispatch = useDispatch();
  const { startDrag, cancelDrag, updateDrag, dragging } = useDrag(
    (percent: number) => dispatch(seek(percent)),
  );

  const is_casting = useRef(player.is_casting);

  // TODO: Hack - can this be done some other way?
  useEffect(() => {
    is_casting.current = player.is_casting;
  }, [player.is_casting]);

  useEffect(() => {
    startAnimationLoop(() => {
      const audio_progress = getAudioProgress(
        player.now_playing,
        is_casting.current,
      );

      if (audio_progress === progress) {
        return;
      }

      setProgress(audio_progress);
      dispatch(setAudioProgress(audio_progress));
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

    // Copy of this value in case it changes before this effect is cleaned up
    const is_casting_local_var = is_casting.current;

    if (!is_casting_local_var) {
      audio.addEventListener("timeupdate", onCrossover);
      crossover.addEventListener("timeupdate", onCrossover);
    }

    return () => {
      cancelAllAnimationFrames();

      if (!is_casting_local_var) {
        audio.removeEventListener("timeupdate", onCrossover);
        crossover.removeEventListener("timeupdate", onCrossover);
      }
    };
  }, [is_casting.current, player.now_playing]);

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
        <div className="scrubber" style={{ width: `${progress * 100}%` }}></div>
        <div
          className={"slider" + (dragging ? " visible" : "")}
          style={{ left: `${progress * 100}%` }}
        ></div>
      </div>

      <div className="time-tracking">
        <div className="current-time">
          {player.now_playing &&
            getTimeTracking(
              player.is_casting
                ? progress * player.now_playing.duration
                : audio.currentTime,
            )}
        </div>
        <div className="end-time">
          {player.now_playing && getTimeTracking(player.now_playing.duration)}
        </div>
      </div>
    </>
  );
};
