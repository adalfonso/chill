import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/models/Media";
import { Nullable } from "@common/types";
import { PreCastPayload } from "@client/lib/cast/types";
import { addToQueue, playNext } from "@reducers/player";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import { getState } from "@reducers/store";
import { noPropagate } from "@client/lib/util";
import { toggle } from "@reducers/playlistEditor";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { useMenu } from "@hooks/useMenu";

export interface FileMenuHandler {
  play: () => void;
  getFiles: (
    is_casting: boolean,
  ) => Promise<{ files: Media[]; cast_info: Nullable<PreCastPayload> }>;
  toggle?: (visible: boolean) => void;
}

interface FileMenuProps {
  menu_id: string;
  title: string;
  handler?: FileMenuHandler;
  children?: JSX.Element | JSX.Element[];
}

export const FileMenu = ({
  menu_id,
  title,
  handler,
  children,
}: FileMenuProps) => {
  const { mediaMenu } = useSelector(getState);
  const active = menu_id === mediaMenu.menu_id;
  const dispatch = useDispatch();
  const menu = useMenu(menu_id);
  const { player } = useSelector(getState);

  useEffect(() => {
    if (active) {
      return;
    }

    handler?.toggle?.(false);
  }, [mediaMenu.menu_id]);

  const onEntryClick = noPropagate(() => {
    handler?.toggle?.(!menu.is_active);
    menu.toggle();
  });

  const onOptionClick = (fn: () => void) =>
    noPropagate(() => {
      fn();
      handler?.toggle?.(false);
      menu.clear();
    });

  const local = {
    playNext: async () =>
      handler &&
      dispatch(playNext((await handler.getFiles(player.is_casting)).files)),
    addToQueue: async () =>
      handler &&
      dispatch(addToQueue((await handler.getFiles(player.is_casting)).files)),
    addToPlaylist: async () =>
      handler &&
      dispatch(
        toggle({ items: (await handler.getFiles(player.is_casting)).files }),
      ),
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
          <div className="title">{title}</div>

          {handler && (
            <>
              <div onClick={onOptionClick(handler.play)}>Play</div>
              <div onClick={onOptionClick(local.playNext)}>Play Next</div>
              <div onClick={onOptionClick(local.addToQueue)}>Add to Queue</div>
              <div onClick={onOptionClick(local.addToPlaylist)}>
                Add to Playlist
              </div>
            </>
          )}

          {children}
        </section>
      )}
    </>
  );
};
