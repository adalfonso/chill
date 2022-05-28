import { useState, useEffect } from "react";

export function useMultiClick(on_click, on_double_click, delay = 300) {
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
}
