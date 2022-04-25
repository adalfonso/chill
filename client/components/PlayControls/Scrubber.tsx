import "./Scrubber.scss";
import * as React from "react";
import { useState } from "react";

interface ScrubberProps {
  progress: number;
  onScrub: (percent: number) => Promise<void>;
}

export const Scrubber = ({ progress, onScrub }: ScrubberProps) => {
  const [dragging, setDragging] = useState(false);

  const dragScrubber = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
  };

  const releaseScrubber = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) {
      return;
    }

    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.right;

    await onScrub(percent);
    setDragging(false);
  };
  return (
    <div
      className="phantom"
      onMouseDown={dragScrubber}
      onMouseUp={releaseScrubber}
    >
      <div className="scrubber" style={{ width: `${progress}%` }}></div>
    </div>
  );
};
