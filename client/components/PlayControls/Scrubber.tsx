import "./Scrubber.scss";
import * as React from "react";
import { useState } from "react";

interface ScrubberProps {
  progress: number;
  onScrub: (percent: number) => Promise<void>;
}

export const Scrubber = ({ progress, onScrub }: ScrubberProps) => {
  const [dragging, setDragging] = useState(false);
  const [progress_override, setProgressOverride] = useState<number>();

  const releaseScrubber = async (e: React.MouseEvent<HTMLElement>) => {
    if (!dragging || !(e.target instanceof HTMLElement)) {
      return;
    }

    await onScrub(calculateXPos(e.target, e.clientX));
    cancelDrag();
  };

  const adjustDrag = (e: React.MouseEvent<HTMLElement>) => {
    if (!dragging || !(e.target instanceof HTMLElement)) {
      return;
    }

    setProgressOverride(calculateXPos(e.target, e.clientX) * 100);
  };

  const cancelDrag = () => {
    setDragging(false);
    setProgressOverride(undefined);
  };

  return (
    <div
      className="phantom"
      onMouseDown={() => setDragging(true)}
      onMouseUp={releaseScrubber}
      onMouseLeave={cancelDrag}
      onMouseMove={adjustDrag}
    >
      <div
        className="scrubber"
        style={{
          width: `${
            progress_override !== undefined ? progress_override : progress
          }%`,
        }}
      ></div>
    </div>
  );
};

const calculateXPos = (element: HTMLElement, offset: number) => {
  const rect = element.getBoundingClientRect();
  const x = offset - rect.left;
  return x / rect.right;
};
