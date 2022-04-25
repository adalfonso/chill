import "./PlayControls.scss";
import * as React from "react";

interface ScrubberProps {
  progress: number;
}

export const Scrubber = ({ progress }: ScrubberProps) => {
  return <div className="scrub" style={{ width: `${progress}%` }}></div>;
};
