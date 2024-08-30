import { RefObject } from "preact";
import { useEffect, useState } from "preact/hooks";

import { ObjectValues } from "@common/types";

const ScrollDirection = {
  None: "none",
  Up: "up",
  Down: "down",
} as const;

type ScrollDirection = ObjectValues<typeof ScrollDirection>;

type ScrollCallback = (direction: ScrollDirection, y: number) => void;

/**
 * React to scroll event
 *
 * @param callback
 */
export const useScroll = (
  ref: RefObject<HTMLDivElement>,
  callback: ScrollCallback,
) => {
  const [previousPosition, setPreviousPosition] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) {
        return;
      }

      const newPosition = ref.current.scrollTop;

      if (newPosition > previousPosition) {
        callback(ScrollDirection.Down, newPosition);
      } else if (newPosition < previousPosition) {
        callback(ScrollDirection.Up, newPosition);
      } else {
        callback(ScrollDirection.None, newPosition);
      }

      setPreviousPosition(newPosition <= 0 ? 0 : newPosition);
    };

    ref.current?.addEventListener("scroll", onScroll);

    return () => ref.current?.removeEventListener("scroll", onScroll);
  }, [ref.current, callback, previousPosition]);
};
