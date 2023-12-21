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
  getAudioProgress,
  next,
  seek,
  setAudioProgress,
} from "@reducers/player";

const gap_offset_s = 0.15;

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

      const audio_duration = player.now_playing?.duration ?? 0;
      const cutoff_point_percent =
        (audio_duration - gap_offset_s) / audio_duration;

      /**
       * We will automatically dispatch the next track when the current track
       * has [gap_offset_s] or less to go. This is a hack to simulate gapless
       * playback.
       */
      if (audio_progress >= cutoff_point_percent) {
        dispatch(next({ auto: true }));
      }

      setProgress(audio_progress);
      dispatch(setAudioProgress(audio_progress));
    });

    return () => {
      cancelAllAnimationFrames();
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
