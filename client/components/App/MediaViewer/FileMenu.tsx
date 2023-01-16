import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/models/Media";
import { MouseEvent, useEffect, useState } from "react";
import { ObjectID } from "bson";
import { addToQueue, playNext } from "@reducers/player";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import { getState } from "@reducers/store";
import { setMenu } from "@reducers/mediaMenu";
import { toggle } from "@reducers/playlistEditor";
import { useDispatch, useSelector } from "react-redux";

interface FileMenuHandler {
  play: (e: MouseEvent<HTMLElement>) => void;
  getFiles: () => Promise<Media[]>;
  toggle: (visible: boolean) => void;
}

interface FileMenuProps {
  handler: FileMenuHandler;
}

export const FileMenu = ({ handler }: FileMenuProps) => {
  const [menu_id] = useState(new ObjectID().toString());
  const { mediaMenu } = useSelector(getState);
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

  const local = {
    playNext: async () =>
      dispatch(playNext({ files: await handler.getFiles() })),
    addToQueue: async () =>
      dispatch(addToQueue({ files: await handler.getFiles() })),
    addToPlaylist: async () =>
      dispatch(toggle({ items: await handler.getFiles() })),
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
          <div onClick={onOptionClick(local.playNext)}>Play Next</div>
          <div onClick={onOptionClick(local.addToQueue)}>Add to Queue</div>
          <div onClick={onOptionClick(local.addToPlaylist)}>
            Add to Playlist
          </div>
        </section>
      )}
    </>
  );
};
