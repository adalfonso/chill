import { useState, useEffect } from "react";

export const useMultiClick = (
  on_click: () => void,
  on_double_click: () => void,
  delay = 300,
) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (count === 1) {
        on_click();
      }
      setCount(0);
    }, delay);

    if (count === 2) {
      on_double_click();
    }

    return () => clearTimeout(timer);
  }, [count]);

  return () => setCount((prev) => prev + 1);
};
