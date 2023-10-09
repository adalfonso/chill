import { useEffect, useRef } from "react";

/**
 * Retain the previous value of some state
 *
 * @param value - the current value
 * @returns the previous value
 */
export const usePrevious = <T>(value: T) => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
