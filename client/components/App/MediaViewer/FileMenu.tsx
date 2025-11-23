import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "preact/hooks";

import { Maybe, PlayableTrack } from "@common/types";
import { PreCastPayload } from "@client/lib/cast/types";
import { VerticalEllipsisIcon } from "@client/components/ui/icons/VerticalEllipsisIcon";
import { getMediaMenuState, getPlayerState } from "@reducers/store";
import { noPropagate } from "@client/lib/Event";
import { toggle } from "@reducers/playlistEditor";
import { useAddToQueue, useMenu, usePlayNext } from "@hooks/index";
import { EllipsisIcon } from "@client/components/ui/icons/EllipsisIcon";
import { ComponentChildren } from "preact";

export type FileMenuHandler = {
  play: (e?: UIEvent) => void;
  getTracks: (is_casting: boolean) => Promise<{
    tracks: Array<PlayableTrack>;
    cast_info: Maybe<PreCastPayload>;
  }>;
  getTrackIds: () => Promise<Array<number>>;
  toggle?: (visible: boolean) => void;
};

type FileMenuProps = {
  menu_id: string;
  title: string | ComponentChildren;
  handler?: FileMenuHandler;
  children?: JSX.Element | JSX.Element[];
  icon_orientation?: "vertical" | "horizontal";
};

export const FileMenu = ({
  menu_id,
  title,
  handler,
  children,
  icon_orientation = "vertical",
}: FileMenuProps) => {
  const player = useSelector(getPlayerState);
  const playNext = usePlayNext();
  const addToQueue = useAddToQueue();
  const mediaMenu = useSelector(getMediaMenuState);
  const active = menu_id === mediaMenu.menu_id;
  const dispatch = useDispatch();
  const menu = useMenu(menu_id);

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
      handler && playNext(await handler.getTracks(player.is_casting)),
    addToQueue: async () =>
      handler && addToQueue(await handler.getTracks(player.is_casting)),
    addToPlaylist: async () =>
      handler &&
      dispatch(
        toggle({
          track_ids: await handler.getTrackIds(),
        }),
      ),
  };

  return (
    <>
      <div
        className={"file-menu-entry" + (active ? " active" : "")}
        onClick={onEntryClick}
      >
        {(icon_orientation === "vertical" && (
          <VerticalEllipsisIcon className="icon-xs" />
        )) || <EllipsisIcon className="icon-xs" />}
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
          <div onClick={() => handler?.toggle && handler.toggle(false)}>
            Close
          </div>
        </section>
      )}
    </>
  );
};
