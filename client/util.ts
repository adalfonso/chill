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

/**
 * Capitalize the first charcter of a string
 *
 * @param value value to capitalize
 * @returns capitalized string
 */
export const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Shuffle an array
 *
 * @param arr array to shuffle
 * @returns shuffled array
 */
export const shuffle = <T>(arr: T[]) => {
  let currentIndex = arr.length,
    randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [arr[currentIndex], arr[randomIndex]] = [
      arr[randomIndex],
      arr[currentIndex],
    ];
  }

  return arr;
};
