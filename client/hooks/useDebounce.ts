import { useEffect, useCallback, DependencyList } from "react";

/**
 * Debounces a function
 *
 * @param effect - fn
 * @param dependencies - dependencies that re-init the callback fn
 * @param delay - debounce delay
 */
export const useDebounce = (
  effect: () => void,
  dependencies: DependencyList,
  delay: number,
) => {
  const callback = useCallback(effect, dependencies);

  useEffect(() => {
    const timeout = setTimeout(callback, delay);
    return () => clearTimeout(timeout);
  }, [callback, delay]);
};
