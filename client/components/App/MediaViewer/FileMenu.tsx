import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "preact/hooks";

import { Maybe, PlayableTrack } from "@common/types";
import { PreCastPayload } from "@client/lib/cast/types";
import { VerticalEllipsisIcon } from "@client/components/ui/icons/VerticalEllipsisIcon";
import { addToQueue, playNext } from "@reducers/player";
import { getState } from "@reducers/store";
import { noPropagate } from "@client/lib/util";
import { toggle } from "@reducers/playlistEditor";
import { useMenu } from "@hooks/index";

export type FileMenuHandler = {
  play: (e?: UIEvent) => void;
  getTracks: (is_casting: boolean) => Promise<{
    tracks: Array<PlayableTrack>;
    cast_info: Maybe<PreCastPayload>;
  }>;
  toggle?: (visible: boolean) => void;
};

type FileMenuProps = {
  menu_id: string;
  title: string;
  handler?: FileMenuHandler;
  children?: JSX.Element | JSX.Element[];
};

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
      handler && dispatch(playNext(await handler.getTracks(player.is_casting))),
    addToQueue: async () =>
      handler &&
      dispatch(addToQueue(await handler.getTracks(player.is_casting))),
    addToPlaylist: async () =>
      handler &&
      dispatch(
        toggle({
          track_ids: (await handler.getTracks(player.is_casting)).tracks,
        }),
      ),
  };

  return (
    <>
      <div
        className={"file-menu-entry" + (active ? " active" : "")}
        onClick={onEntryClick}
      >
        <VerticalEllipsisIcon className="icon-xs" />
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
