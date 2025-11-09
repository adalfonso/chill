import { useEffect, useRef } from "preact/hooks";
import { useSelector } from "react-redux";

import "./Scrubber.scss";
import * as AudioProgress from "@client/lib/AudioProgress";
import { CastSdk } from "@client/lib/cast/CastSdk";
import { Maybe, PlayableTrackWithIndex } from "@common/types";
import { audio, crossover } from "@reducers/player";
import { getPlayerState } from "@reducers/store";
import { useDrag, useAppState, useNext, useSeek } from "@hooks/index";

const gap_offset = 0.25;

export const Scrubber = () => {
  const { progress, progress_s, outgoing_connection } = useAppState();
  const seek = useSeek();
  const next = useNext();
  const player = useSelector(getPlayerState);
  const { startDrag, cancelDrag, updateDrag, dragging } = useDrag(seek);

  const is_casting = useRef(player.is_casting);

  // TODO: Hack - can this be done some other way?
  useEffect(() => {
    is_casting.current = player.is_casting;
  }, [player.is_casting]);

  useEffect(() => {
    AudioProgress.startAnimationLoop(() => {
      const audio_progress = getAudioProgress(
        player.now_playing,
        is_casting.current,
      );

      // Skip if progress is being read from some target device, or if the
      // progress has not changed
      if (outgoing_connection.value || audio_progress === progress.value) {
        return;
      }

      progress.value = audio_progress;

      if (player.now_playing) {
        progress_s.value = Math.floor(
          progress.value * player.now_playing.duration,
        );
      }
    }, 20);

    /**
     * We will automatically dispatch the next track when the current track has
     * 200ms or less to go. This is a hack to simulate gapless playback.
     * Additionally both the audio and the crossover audio's closure will
     * reference "audio". That's because either fixture may be playing at a
     * given time, but the only the one currently playing will be referenced as
     * "audio" due to the swapping nature of the crossover.
     */

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
          {player.now_playing &&
            AudioProgress.getTimeTracking(
              progress.value * player.now_playing.duration,
            )}
        </div>
        <div className="end-time">
          {player.now_playing &&
            AudioProgress.getTimeTracking(player.now_playing.duration)}
        </div>
      </div>
    </>
  );
};

/**
 * Get the audio progress for a playing track
 *
 * @param media - media that is playing
 * @param is_casting - if the media is playing on chromecast
 * @returns progress percentage 0-1
 */
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
