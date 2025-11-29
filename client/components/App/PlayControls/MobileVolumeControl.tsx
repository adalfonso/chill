import { useSelector } from "react-redux";
import { getPlayerState } from "@reducers/store";

import "./MobileVolumeControl.scss";
import { useChangeVolume } from "@hooks/useChangeVolume";
import { DragOrientation, useDrag } from "@hooks/useDrag";
import { useLongPress } from "@hooks/useLongPress";
import { useSignal } from "@preact/signals";

export const MobileVolumeControl = () => {
  const player = useSelector(getPlayerState);
  const changeVolume = useChangeVolume();
  const visible = useSignal(false);

  const { startDrag, cancelDrag, updateDrag, dragging } = useDrag(
    DragOrientation.Vertical,
    (percent: number) => {
      percent = Math.round(percent * 100) / 100;

      if (percent - player.volume === 0) {
        return;
      }

      changeVolume(percent);
    },
  );

  const press = useLongPress(
    () => {
      visible.value = true;
    },
    1000,
    { mouse: false, touch: true },
    true,
  );

  const onPointerUp = (e: PointerEvent) => {
    press.cancelPress();

    if (visible.value) {
      cancelDrag(e);

      setTimeout(() => {
        visible.value = false;
      }, 100);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) {
      startDrag(e);
    }

    if (visible.value) {
      updateDrag(e);
    }
  };

  return (
    <div
      id="mobile-volume"
      data-visible={visible.value}
      onPointerDown={press.events.onTouchStart}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerMove={onPointerMove}
      // Manually prevent this since we use the longpress events manually
      onContextMenu={(e: UIEvent) => e.preventDefault()}
    >
      <div
        className="volume-level"
        style={{ height: `${player.volume * 100}%` }}
      ></div>
    </div>
  );
};
