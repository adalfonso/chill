import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import "./MediaTile.scss";
import { FileMenu, FileMenuHandler } from "../FileMenu";
import { MediaTileData, MediaTileType, PlayableTrack } from "@common/types";
import { PlayCircleIcon } from "@client/components/ui/icons/PlayCircleIcon";
import { albumUrl, artistUrl, matchUrl } from "@client/lib/url";
import { api } from "@client/client";
import { getState } from "@client/state/reducers/store";
import { noPropagate } from "@client/lib/util";
import { play } from "@reducers/player";
import { screen_breakpoint_px } from "@client/lib/constants";
import { setMenu } from "@client/state/reducers/mediaMenu";
import {
  useBackNavigate,
  useId,
  useLongPress,
  useMenu,
  usePrevious,
  useViewport,
} from "@hooks/index";

type MediaTileProps<T extends Record<string, unknown>> = {
  tile_type: MediaTileType;
  tile_data: MediaTileData<T>;
  url: (file: MediaTileData<T>) => string;
  displayAs: (file: MediaTileData<T>) => string;

  // xxx: did I break this? doesnt appear to be passed in anymore
  /// Prevents context menu from opening during scroll
  parentScrollPosition?: number;
};

export const MediaTile = <T extends Record<string, unknown>>({
  tile_type,
  tile_data,
  url,
  displayAs,
  parentScrollPosition,
}: MediaTileProps<T>) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { player } = useSelector(getState);
  const menu_id = useId();

  const menu = useMenu(menu_id);
  const { width } = useViewport();
  const [menu_visible, setMenuVisible] = useState(false);
  const previousParentScrollPosition = usePrevious(parentScrollPosition);

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

  if (parentScrollPosition !== previousParentScrollPosition) {
    onPress.cancelPress();
  }

  const optionsHandler: FileMenuHandler = {
    play: async () => {
      const { tracks, cast_info } = await getTracks(
        tile_type,
        tile_data,
      )(player.is_casting);

      dispatch(play({ tracks, cast_info, index: 0 }));
    },
    getTracks: getTracks(tile_type, tile_data),
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
        </div>,
      ],
    ];

    return children.filter(([cond]) => cond).map(([_, jsx]) => jsx);
  };

  return (
    <div className="media-tile-wrapper" {...onPress.events}>
      <div
        className={"media-tile" + (menu_visible ? " active" : "")}
        onClick={() => navigate(url(tile_data))}
      >
        {tile_data.image && (
          <img
            src={`/api/v1/media/cover/${tile_data.image}?size=176`}
            loading="lazy"
          />
        )}

        <div className={"more" + (menu_visible ? " active" : "")}>
          <div className="play" onClick={noPropagate(optionsHandler.play)}>
            <PlayCircleIcon className="play-icon icon-lg" />
          </div>

          <FileMenu
            menu_id={menu_id}
            title={tile_data.name ?? "File Menu"}
            handler={optionsHandler}
          >
            {getFileMenuChildren()}
          </FileMenu>
        </div>
      </div>
      <div className="display-as">{displayAs(tile_data)}</div>
    </div>
  );
};

const getSortString = (track: PlayableTrack) =>
  (track.artist ?? "") +
  (track.album ?? "") +
  (track.number ?? "").toString().padStart(3, "0");

export const getTracks =
  <T extends Record<string, unknown>>(
    tile_tile: MediaTileType,
    tile: MediaTileData<T>,
  ) =>
  async (is_casting = false) => {
    // TODO: The controller used here has an issue with the type
    // e.g. duration is not available but the type thinks it's valid

    const tracks = (await fileApi(tile_tile, tile)).sort((a, b) =>
      getSortString(a).localeCompare(getSortString(b)),
    );

    if (!is_casting) {
      return { tracks, cast_info: null };
    }

    const cast_info = await api.track.castInfo.query({
      track_ids: tracks.map((file) => file.id),
    });

    return { tracks, cast_info };
  };

const fileApi = async <T extends Record<string, unknown>>(
  tile_type: MediaTileType,
  tile: MediaTileData<T>,
) => {
  switch (tile_type) {
    case MediaTileType.Artist:
      return api.track.getByAlbumAndOrArtist.query({ artist_id: tile.id });
    case MediaTileType.Album:
      return api.track.getByAlbumAndOrArtist.query({ album_id: tile.id });
    case MediaTileType.Genre:
      return api.track.getByGenre.query({ genre_id: tile.id });
  }
};
