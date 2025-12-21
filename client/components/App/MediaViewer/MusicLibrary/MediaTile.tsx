import { Signal } from "@preact/signals";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "wouter-preact";

import "./MediaTile.scss";
import { FileMenu, FileMenuHandler } from "../FileMenu";
import { Maybe, MediaTileData, MediaTileType } from "@common/types";
import { PlayCircleIcon } from "@client/components/ui/icons/PlayCircleIcon";
import { albumUrl, artistUrl, matchUrl } from "@client/lib/Url";
import { api } from "@client/client";
import { getPlayerState } from "@client/state/reducers/store";
import { noPropagate } from "@client/lib/Event";
import { screen_breakpoint_px } from "@client/lib/constants";
import { setMenu } from "@client/state/reducers/mediaMenu";
import {
  useBackNavigate,
  useId,
  useLongPress,
  useMenu,
  usePlay,
  useViewport,
} from "@hooks/index";
import {
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
  DEFAULT_PAGE,
} from "@common/pagination";
import {
  getTrackIds,
  getTracks as loadTracks,
  sort_clauses,
} from "@client/lib/TrackLoaders";

type MediaTileProps<T extends Record<string, unknown>> = {
  tile_type: MediaTileType;
  tile_data: MediaTileData<T>;
  index: number;
  url: Maybe<(file: MediaTileData<T>) => string>;
  displayAs: (file: MediaTileData<T>) => string;

  // This gets attached automatically by SmartScroller
  parent_scroll_position?: Signal<number>;
};

export const MediaTile = <T extends Record<string, unknown>>({
  tile_type,
  tile_data,
  index,
  url,
  displayAs,
  parent_scroll_position,
}: MediaTileProps<T>) => {
  const [, navigate] = useLocation();
  const dispatch = useDispatch();
  const player = useSelector(getPlayerState);
  const menu_id = useId();
  const previous_position = useRef(parent_scroll_position?.peek());
  const play = usePlay();
  const menu = useMenu(menu_id);
  const { width } = useViewport();
  const [menu_visible, setMenuVisible] = useState(false);

  const closeMenu = () => {
    setMenuVisible(false);
    dispatch(setMenu(null));
  };

  const openMenu = () => {
    setMenuVisible(true);
    menu.set();
  };

  const is_mobile = width < screen_breakpoint_px;

  const menuIsActiveOnMobile = () => is_mobile && menu_visible;

  // Minimize the context menu on back navigation
  useBackNavigate(menuIsActiveOnMobile, closeMenu);

  const onPress = useLongPress(
    openMenu,
    500,
    { mouse: false, touch: true },
    true,
  );

  useEffect(() => {
    previous_position.current = parent_scroll_position?.value;

    const unsubscribe = parent_scroll_position?.subscribe(
      (current_position) => {
        if (
          onPress.is_pressing &&
          current_position !== previous_position.current
        ) {
          previous_position.current = parent_scroll_position.value;
          onPress.cancelPress();
        }
      },
    );

    return unsubscribe;
  }, [onPress.is_pressing, onPress.last_cancelled]);

  const optionsHandler: FileMenuHandler = {
    play: async () => {
      const offset = index ?? DEFAULT_OFFSET;

      const { tracks, cast_info } = await getTracksForMediaTile(
        tile_type,
        tile_data,
        DEFAULT_LIMIT,
        offset,
      )(player.is_casting);

      const getMode = (type: MediaTileType) => {
        switch (type) {
          case MediaTileType.Artist:
            return MediaTileType.Artist;

          case MediaTileType.Album:
          case MediaTileType.Compilation:
          case MediaTileType.Split:
            return MediaTileType.Album;

          case MediaTileType.Genre:
            return MediaTileType.Genre;

          case MediaTileType.Track:
            return MediaTileType.Track;
        }
      };

      const play_options = {
        mode: getMode(tile_type),
        id: tile_data.id,
        limit: DEFAULT_LIMIT,
        offset,
        page: DEFAULT_PAGE,
        more: true,
      };

      play({ tracks, cast_info, index: 0, play_options });
    },
    getTracks: getTracksForMediaTile(tile_type, tile_data),

    getTrackIds: () =>
      TrackIdApi(
        tile_type,
        tile_data,
        // Used for "Add to playlist"
        Number.MAX_SAFE_INTEGER,
      ),
    toggle: setMenuVisible,
  };

  // TODO: This is ugly, will TS allow these to be conditional children?
  const getFileMenuChildren = () => {
    const children: [boolean, JSX.Element][] = [
      [
        tile_type === MediaTileType.Artist,
        <div
          key="artist"
          onClick={noPropagate(() => {
            navigate(artistUrl(tile_data.id), {
              replace: menuIsActiveOnMobile(),
            });
          })}
        >
          Go to Artist
          <div className="dim file-menu-subtext">{tile_data.name}</div>
        </div>,
      ],
      [
        tile_type === MediaTileType.Album,
        <div
          key="album"
          onClick={noPropagate(() => {
            navigate(albumUrl()(tile_data.id), {
              replace: menuIsActiveOnMobile(),
            });
          })}
        >
          Go to Album
          <div className="dim file-menu-subtext">{tile_data.name}</div>
        </div>,
      ],
      [
        tile_type === MediaTileType.Genre,
        <div
          key="genre"
          onClick={noPropagate(() => {
            navigate(matchUrl(MediaTileType.Genre)(tile_data.id), {
              replace: menuIsActiveOnMobile(),
            });
          })}
        >
          Go to Genre
          <div className="dim file-menu-subtext">{tile_data.name}</div>
        </div>,
      ],
    ];

    return children.filter(([cond]) => cond).map(([_, jsx]) => jsx);
  };

  const contextMenu = (
    <FileMenu
      menu_id={menu_id}
      title={tile_data.name ?? "File Menu"}
      handler={optionsHandler}
    >
      {getFileMenuChildren()}
    </FileMenu>
  );

  const onClick = () => {
    if (tile_type === MediaTileType.Track) {
      optionsHandler.play();
      return;
    }

    if (url) {
      navigate(url(tile_data));
    }
  };

  return (
    <div className="media-tile" {...onPress.events} onClick={onClick}>
      <div className={"media-tile-image" + (menu_visible ? " active" : "")}>
        {tile_data.image && (
          <img
            src={`/api/v1/media/cover/${tile_data.image}?size=176`}
            loading="lazy"
          />
        )}

        {/* Show context menu on image in desktop */}
        {!is_mobile && (
          <div className={"more" + (menu_visible ? " active" : "")}>
            <div className="play" onClick={noPropagate(optionsHandler.play)}>
              <PlayCircleIcon className="play-icon icon-lg" />
            </div>

            {contextMenu}
          </div>
        )}
      </div>
      <div className="display-as">{displayAs(tile_data)}</div>

      {/* Show context menu always on mobile*/}
      {is_mobile && contextMenu}
    </div>
  );
};

const getTracksForMediaTile =
  <T extends Record<string, unknown>>(
    tile_tile: MediaTileType,
    tile: MediaTileData<T>,
    limit?: number,
    offset?: number,
  ) =>
  async (is_casting = false) => {
    const tracks = await TrackApi(tile_tile, tile, limit, offset);

    if (!is_casting) {
      return { tracks, cast_info: null };
    }

    const cast_info = await api.track.castInfo.query({
      track_ids: tracks.map((file) => file.id),
    });

    return { tracks, cast_info };
  };

const TrackApi = async <T extends Record<string, unknown>>(
  tile_type: MediaTileType,
  tile: MediaTileData<T>,
  limit?: number,
  offset?: number,
) => {
  switch (tile_type) {
    case MediaTileType.Artist:
      return loadTracks(
        { artist_id: tile.id },
        { limit, offset, sort: sort_clauses.artist },
      );

    case MediaTileType.Album:
    case MediaTileType.Compilation:
    case MediaTileType.Split:
      return loadTracks(
        { album_id: tile.id },
        { limit, offset, sort: sort_clauses.album },
      );

    case MediaTileType.Genre:
      return loadTracks(
        { genre_id: tile.id },
        { limit, offset, sort: sort_clauses.genre },
      );

    case MediaTileType.Track:
      return loadTracks({}, { limit, offset, sort: sort_clauses.track });
  }
};

const TrackIdApi = async <T extends Record<string, unknown>>(
  tile_type: MediaTileType,
  tile: MediaTileData<T>,
  limit?: number,
) => {
  switch (tile_type) {
    case MediaTileType.Artist:
      return getTrackIds(
        { artist_id: tile.id },
        { limit, sort: sort_clauses.artist },
      );

    case MediaTileType.Album:
    case MediaTileType.Compilation:
    case MediaTileType.Split:
      return getTrackIds(
        { album_id: tile.id },
        { limit, sort: sort_clauses.album },
      );

    case MediaTileType.Genre:
      return getTrackIds(
        { genre_id: tile.id },
        { limit, sort: sort_clauses.genre },
      );

    case MediaTileType.Track:
      return getTrackIds({}, { limit, sort: sort_clauses.track });
  }
};
