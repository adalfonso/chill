import {
  useState,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
} from "react";

type DragEvent = ReactMouseEvent<HTMLElement> | ReactTouchEvent<HTMLElement>;

/**
 * Utilize dragging behavior
 *
 * @param onApply - fn to apply on drag
 * @returns drag events
 */
export const useDrag = (onApply: (percent: number) => void) => {
  const [dragging, setDragging] = useState(false);

  const startDrag = () => setDragging(true);
  const cancelDrag = () => setDragging(false);

  const updateDrag = (e: DragEvent) => {
    if (!dragging || !(e.target instanceof HTMLElement)) {
      return;
    }

    onApply(calculateXPos(e.currentTarget, getOffset(e)));
  };

  return {
    startDrag,
    cancelDrag,
    updateDrag,
    dragging,
  };
};

const getOffset = (e: DragEvent) => {
  if (e.nativeEvent instanceof MouseEvent) {
    return e.nativeEvent.clientX;
  }

  if (e.nativeEvent instanceof TouchEvent) {
    return e.nativeEvent.touches[0].pageX;
  }

  throw new Error("Unable to detect offset from event.");
};

const calculateXPos = (element: HTMLElement, offset: number) => {
  const rect = element.getBoundingClientRect();
  const x = offset - rect.left;

  return Math.min(1, Math.max(0, x / (rect.right - rect.left)));
};
