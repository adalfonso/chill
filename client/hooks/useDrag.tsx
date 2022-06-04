import { useState } from "react";

export function useDrag(onApply: (percent: number) => void) {
  const [dragging, setDragging] = useState(false);

  const startDrag = () => setDragging(true);
  const cancelDrag = () => setDragging(false);

  const updateDrag = (e: React.MouseEvent<HTMLElement>) => {
    if (!dragging || !(e.target instanceof HTMLElement)) {
      return;
    }

    onApply(calculateXPos(e.target, e.clientX));
  };

  return {
    startDrag,
    cancelDrag,
    updateDrag,
  };
}

const calculateXPos = (element: HTMLElement, offset: number) => {
  const rect = element.getBoundingClientRect();
  const x = offset - rect.left;

  return x / (rect.right - rect.left);
};
