import { useCallback, useEffect, useState } from "react";

type ScrollCallback = (y?: number) => void;

/**
 * React to scroll event
 *
 * @param callback
 */
export const useScroll = (callback: ScrollCallback) => {
  const [y, setY] = useState(window.scrollY);

  const handleNavigation = useCallback(
    (e) => {
      console.log(e.currentTarget);
      const window = e.currentTarget;

      if (y === window.scrollY) {
        return;
      }

      callback(window.scrollY);

      setY(window.scrollY);
    },
    [y],
  );

  useEffect(() => {
    setY(window.scrollY);
    window.addEventListener("scroll", handleNavigation);

    return () => {
      window.removeEventListener("scroll", handleNavigation);
    };
  }, [handleNavigation]);
};
