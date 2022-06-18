import React, { MouseEvent } from "react";

interface FileMenuHandler {
  play: (e: MouseEvent<HTMLElement>) => void;
  playNext: (e: MouseEvent<HTMLElement>) => void;
  addToQueue: (e: MouseEvent<HTMLElement>) => void;
}

interface FileMenuProps {
  handler: FileMenuHandler;
}

export const FileMenu = ({ handler }: FileMenuProps) => {
  return (
    <section className="file-options">
      <div onClick={handler.play}>Play</div>
      <div onClick={handler.playNext}>Play Next</div>
      <div onClick={handler.addToQueue}>Add to Queue</div>
    </section>
  );
};
