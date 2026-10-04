/**
 * Create an animation frame loop
 *
 * @param callback - callback to perform on each frame render
 */
export const startAnimationLoop = (
  callback: (dt: number) => unknown,
  fps = 60,
) => {
  let lastTime = 0;
  const interval = 1000 / fps;

  const frame: FrameRequestCallback = (time: number) => {
    const dt = time - lastTime;

    if (dt >= interval) {
      lastTime = time;
      callback(dt);
    }

    requestAnimationFrame(frame);
  };

  return requestAnimationFrame(frame);
};

/** Haphazardly clear all animation frames */
export const cancelAnimationFrames = () => {
  let id = requestAnimationFrame(() => {});
  while (id--) {
    cancelAnimationFrame(id);
  }
};

/**
 * Format a track length as m:ss
 *
 * Rounds to the nearest second. A non-finite value (NaN before the duration
 * is known, Infinity for a live stream) reads as 0:00.
 *
 * @param time - duration in seconds
 * @returns the time formatted as m:ss
 */
export const getTimeTracking = (time: number) =>
  formatClock(Number.isFinite(time) ? Math.round(time) : 0);

/**
 * Format a playback position as m:ss
 *
 * Floors to the whole second, so a track reads 0:00 for its first full second
 * and the clock never runs ahead of the audio (and agrees with the floored
 * `progress_s`). An exact 0 must stay 0:00, not be bumped to 0:01, or the
 * clock flashes 0:01 -> 0:00 as a track starts. A non-finite value reads as
 * 0:00.
 *
 * @param time - position in seconds
 * @returns the time formatted as m:ss
 */
export const getElapsedTimeTracking = (time: number) =>
  formatClock(Number.isFinite(time) ? Math.floor(time) : 0);

export const secondsToMinutes = (duration: number) => {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration - minutes * 60);
  const pad = (duration: number) => duration.toString().padStart(2, "0");

  return `${minutes}:${pad(seconds)}`;
};

/**
 * Format whole seconds as m:ss
 *
 * @param seconds - a whole, non-negative number of seconds
 * @returns the time formatted as m:ss
 */
const formatClock = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60).toString();
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainder}`;
};
