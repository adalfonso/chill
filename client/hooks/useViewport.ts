import { useState, useEffect } from "react";

const getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

/**
 * Get the viewport dimensions
 *
 * @returns viewport dimensions
 */
export const useViewport = () => {
  const [viewport, setViewport] = useState(getViewport());

  useEffect(() => {
    const resize = () => setViewport(getViewport());

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return viewport;
};
