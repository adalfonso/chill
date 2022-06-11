/**
 * Create an animation frame loop
 *
 * @param callback - callback to perform on each frame render
 */
export const startAnimationLoop = (callback: (dt: number) => unknown) => {
  let lastTime = 0;

  const frame: FrameRequestCallback = (time: number) => {
    const dt = time - lastTime;
    lastTime = time;

    callback(dt);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
};

export const getTimeTracking = (time: number) => {
  const cleaned = Math.round(time);

  const minutes = Math.floor(cleaned / 60)
    .toString()
    .padStart(1, "0");

  const seconds = Math.floor(cleaned % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
};

export const secondsToMinutes = (duration: number) => {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration - minutes * 60);
  const pad = (duration: number) => duration.toString().padStart(2, "0");

  return `${minutes}:${pad(seconds)}`;
};
