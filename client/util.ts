/**
 * Create an animation frame loop
 *
 * @param callback - callback to perform on each frame render
 */
export const startAnimationLoop = (callback: (dt: number) => unknown) => {
  let lastTime: number = 0;

  const frame: FrameRequestCallback = (time: number) => {
    let dt: number = time - lastTime;
    lastTime = time;

    callback(dt);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
};

export const ucfirst = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);
