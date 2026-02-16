import { useEffect, useRef } from "preact/hooks";

import "./Scrubber.scss";
import * as AudioProgress from "@client/lib/AudioProgress";
import { CastSdk } from "@client/lib/cast/CastSdk";
import { Maybe, PlayableTrackWithIndex } from "@common/types";
import { audio, crossover } from "@client/state/playerStore";
import * as playerStore from "@client/state/playerStore";
import {
  useDrag,
  useAppState,
  useNext,
  useSeek,
  DragOrientation,
} from "@hooks/index";

const gap_offset = 0.25;

export const Scrubber = () => {
  const { progress, progress_s, outgoing_connection } = useAppState();
  const seek = useSeek();
  const next = useNext();
  const { startDrag, cancelDrag, updateDrag, dragging } = useDrag(
    DragOrientation.Horizontal,
    seek,
  );

  const is_casting = useRef(playerStore.is_casting.value);

  // TODO: Hack - can this be done some other way?
  useEffect(() => {
    is_casting.current = playerStore.is_casting.value;
  }, [playerStore.is_casting.value]);

  useEffect(() => {
    AudioProgress.startAnimationLoop(() => {
      const audio_progress = getAudioProgress(
        playerStore.now_playing.value,
        is_casting.current,
      );

      // Skip if progress is being read from some target device, or if the
      // progress has not changed
      if (outgoing_connection.value || audio_progress === progress.value) {
        return;
      }

      progress.value = audio_progress;

      if (playerStore.now_playing.value) {
        progress_s.value = Math.floor(
          progress.value * playerStore.now_playing.value.duration,
        );
      }
    }, 20);

    const onCrossover = () =>
      audio.duration - audio.currentTime < gap_offset && next({ auto: true });

    // Copy of this value in case it changes before this effect is cleaned up
    const is_casting_local_var = is_casting.current;

    if (!is_casting_local_var) {
      audio.addEventListener("timeupdate", onCrossover);
      crossover.addEventListener("timeupdate", onCrossover);
    }

    return () => {
      AudioProgress.cancelAnimationFrames();

      if (!is_casting_local_var) {
        audio.removeEventListener("timeupdate", onCrossover);
        crossover.removeEventListener("timeupdate", onCrossover);
      }
    };
  }, [is_casting.current, playerStore.now_playing.value]);

  return (
    <>
      <div
        className="scrubber-container"
        onPointerDown={startDrag}
        onPointerUp={cancelDrag}
        onPointerCancel={cancelDrag}
        onPointerMove={updateDrag}
      >
        <div
          className="scrubber"
          style={{ width: `${progress.value * 100}%` }}
        ></div>
        <div
          className={"slider" + (dragging ? " visible" : "")}
          style={{ left: `${progress.value * 100}%` }}
        ></div>
      </div>

      <div className="time-tracking">
        <div className="current-time">
          {playerStore.now_playing.value &&
            AudioProgress.getTimeTracking(
              progress.value * playerStore.now_playing.value.duration,
            )}
        </div>
        <div className="end-time">
          {playerStore.now_playing.value &&
            AudioProgress.getTimeTracking(
              playerStore.now_playing.value.duration,
            )}
        </div>
      </div>
    </>
  );
};

const getAudioProgress = (
  media: Maybe<PlayableTrackWithIndex>,
  is_casting = false,
) => {
  if (media === null || !media.duration) {
    return 0;
  }

  if (is_casting) {
    return CastSdk.currentTime() / media.duration;
  }

  return audio.currentTime ? audio.currentTime / media.duration : 0;
};
