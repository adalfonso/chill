import React, { MouseEvent, useEffect, useState } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { RootState } from "@reducers/store";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { ObjectID } from "bson";
import { setMenu } from "@reducers/mediaMenuReducer";

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
  const [menu_id] = useState(new ObjectID().toString());
  const { mediaMenu } = useSelector((state: RootState) => state);
  const active = menu_id === mediaMenu.menu_id;
  const dispatch = useDispatch();

  useEffect(() => {
    if (active) {
      return;
    }
    handler.toggle(false);
  }, [mediaMenu.menu_id]);

  const onEntryClick = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    handler.toggle(!active);
    dispatch(setMenu({ menu_id: active ? null : menu_id }));
  };

  const onOptionClick =
    (fn: (e: MouseEvent<HTMLElement>) => void) =>
    (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      fn(e);
      handler.toggle(false);
      dispatch(setMenu({ menu_id: null }));
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
