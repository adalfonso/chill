import { useEffect } from "preact/hooks";

import "./Scrubber.scss";
import * as AudioProgress from "@client/lib/AudioProgress";
import * as player from "@client/state/playerStore";
import { CastSdk } from "@client/lib/cast/CastSdk";
import { Maybe, PlayableTrackWithIndex } from "@common/types";
import { audio, crossover } from "@client/state/playerStore";
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

  useEffect(() => {
    AudioProgress.startAnimationLoop(() => {
      const audio_progress = getAudioProgress(
        player.now_playing.value,
        player.is_casting.value,
      );

      // Skip if progress is being read from some target device, or if the
      // progress has not changed
      if (outgoing_connection.value || audio_progress === progress.value) {
        return;
      }

      progress.value = audio_progress;

      if (player.now_playing.value) {
        progress_s.value = Math.floor(
          progress.value * player.now_playing.value.duration,
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

    // Capture the casting state at effect setup time for proper cleanup
    const is_casting_at_setup = player.is_casting.value;

    if (!is_casting_at_setup) {
      audio.addEventListener("timeupdate", onCrossover);
      crossover.addEventListener("timeupdate", onCrossover);
    }

    return () => {
      AudioProgress.cancelAnimationFrames();

      if (!is_casting_at_setup) {
        audio.removeEventListener("timeupdate", onCrossover);
        crossover.removeEventListener("timeupdate", onCrossover);
      }
    };
  }, [player.is_casting.value, player.now_playing.value]);

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
          {player.now_playing.value &&
            AudioProgress.getTimeTracking(
              progress.value * player.now_playing.value.duration,
            )}
        </div>
        <div className="end-time">
          {player.now_playing.value &&
            AudioProgress.getTimeTracking(player.now_playing.value.duration)}
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
