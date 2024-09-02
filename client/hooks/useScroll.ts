import { RefObject } from "preact";
import { useEffect, useState } from "preact/hooks";

import { ObjectValues } from "@common/types";

const ScrollDirection = {
  None: "none",
  Up: "up",
  Down: "down",
} as const;

export type ScrollDirection = ObjectValues<typeof ScrollDirection>;

type ScrollCallback = (y: number, direction: ScrollDirection) => void;

/**
 * React to scroll event
 *
 * @param callback
 */
export const useScroll = (
  ref: RefObject<HTMLDivElement>,
  callback: ScrollCallback,
  throttle_delay_ms = 1000 / 60,
) => {
  const [previous_position, setPreviousPosition] = useState(0);
  const [last_update, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) {
        return;
      }

      const new_position = ref.current.scrollTop;
      const now = Date.now();

      if (now - last_update < throttle_delay_ms) {
        return;
      }

      if (new_position > previous_position) {
        callback(new_position, ScrollDirection.Down);
      } else if (new_position < previous_position) {
        callback(new_position, ScrollDirection.Up);
      } else {
        callback(new_position, ScrollDirection.None);
      }

      setPreviousPosition(new_position <= 0 ? 0 : new_position);
      setLastUpdate(now);
    };

    ref.current?.addEventListener("scroll", onScroll);

    return () => ref.current?.removeEventListener("scroll", onScroll);
  }, [ref.current, callback, previous_position]);
};
