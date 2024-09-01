/**
 * Disables event propagation
 *
 * @param fn - callback fn
 * @returns event handler fn
 */
export const noPropagate =
  <Event extends UIEvent>(fn?: () => void) =>
  (e: Event) => {
    e.stopPropagation();
    fn?.();
  };
