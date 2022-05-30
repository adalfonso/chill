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
