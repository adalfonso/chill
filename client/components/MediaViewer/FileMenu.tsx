import React, { MouseEvent, useState } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";

interface FileMenuHandler {
  play: (e: MouseEvent<HTMLElement>) => void;
  playNext: (e: MouseEvent<HTMLElement>) => void;
  addToQueue: (e: MouseEvent<HTMLElement>) => void;
  toggle: (visible: boolean) => void;
}

interface FileMenuProps {
  handler: FileMenuHandler;
}

export const FileMenu = ({ handler }: FileMenuProps) => {
  const [active, setActive] = useState(false);

  const onEntryClick = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    handler.toggle(!active);
    setActive(!active);
  };

  const onOptionClick =
    (fn: (e: MouseEvent<HTMLElement>) => void) =>
    (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      fn(e);
      setActive(false);
      handler.toggle(false);
    };

  return (
    <>
      <div
        className={"file-menu-entry" + (active ? " active" : "")}
        onClick={onEntryClick}
      >
        <Icon icon={faEllipsisV} />
      </div>
      {active && (
        <section className="file-menu">
          <div onClick={onOptionClick(handler.play)}>Play</div>
          <div onClick={onOptionClick(handler.playNext)}>Play Next</div>
          <div onClick={onOptionClick(handler.addToQueue)}>Add to Queue</div>
        </section>
      )}
    </>
  );
};
