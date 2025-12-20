import { useSignal } from "@preact/signals";

export const DragOrientation = {
  Horizontal: "horizontal",
  Vertical: "vertical",
} as const;

export type DragOrientation =
  (typeof DragOrientation)[keyof typeof DragOrientation];

/**
 * Utilize dragging behavior
 *
 * @param onApply - fn to apply on drag
 * @returns drag events
 */
export const useDrag = (
  orientation: DragOrientation,
  onApply: (percent: number) => void,
) => {
  const dragging = useSignal(false);

  const startDrag = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.value = true;
  };

  const cancelDrag = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragging.value = false;
  };

  const updateDrag = (e: PointerEvent) => {
    if (!dragging.value || !(e.currentTarget instanceof HTMLElement)) {
      return;
    }

    onApply(
      calculatePos(orientation)(e.currentTarget, getOffset(orientation)(e)),
    );
  };

  return {
    startDrag,
    cancelDrag,
    updateDrag,
    dragging: dragging.value,
  };
};

const getOffset = (orientation: DragOrientation) => (e: PointerEvent) => {
  return orientation === DragOrientation.Horizontal ? e.clientX : e.clientY;
};

const calculatePos =
  (orientation: DragOrientation) => (element: HTMLElement, offset: number) => {
    const rect = element.getBoundingClientRect();
    const size =
      orientation === DragOrientation.Horizontal ? rect.width : rect.height;

    const raw =
      orientation === DragOrientation.Horizontal
        ? offset - rect.left
        : offset - rect.top;

    const normalized = Math.min(1, Math.max(0, raw / size));

    // Vertical sliders: invert so bottom = 0, top = 1
    return orientation === DragOrientation.Horizontal
      ? normalized
      : 1 - normalized;
  };
