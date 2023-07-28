import { Nullable } from "@common/types";
import { UIEvent, useCallback, useRef } from "react";
interface InputTypes {
  mouse: boolean;
  touch: true;
}

/**
 * React to a mouse down or touch for some period of time
 *
 * @param callback - logic performed once held for a certain period
 * @param delay_ms - length of time the hold has to occur
 * @param input_types - mouse and touch flags
 * @returns
 */
export const useLongPress = (
  callback: () => void,
  delay_ms = 300,
  input_types: InputTypes = { mouse: true, touch: true },
  disable_context_menu = true,
) => {
  const timeout = useRef<Nullable<NodeJS.Timeout>>(null);

  const startPress = useCallback(() => {
    timeout.current = setTimeout(() => {
      cancelPress();
      callback();
    }, delay_ms);
  }, [callback, delay_ms]);

  const cancelPress = useCallback(() => {
    timeout.current && clearTimeout(timeout.current);
  }, []);

  return {
    events: {
      ...((input_types.mouse && {
        onMouseDown: startPress,
        onMouseUp: cancelPress,
        onMouseLeave: cancelPress,
      }) ||
        {}),
      ...((input_types.touch && {
        onTouchStart: startPress,
        onTouchEnd: cancelPress,
      }) ||
        {}),
      ...((disable_context_menu && {
        onContextMenu: (e: UIEvent) => e.preventDefault(),
      }) ||
        {}),
    },
    cancelPress,
  };
};
