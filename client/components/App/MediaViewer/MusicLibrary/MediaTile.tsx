import "./MediaTile.scss";
import { albumUrl, artistUrl, matchUrl } from "@client/lib/url";
import { client } from "@client/client";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { FileMenu, FileMenuHandler } from "../FileMenu";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { getState } from "@client/state/reducers/store";
import { GroupedMedia } from "@common/types";
import { Media } from "@common/models/Media";
import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch } from "@common/media/types";
import { noPropagate } from "@client/lib/util";
import { play } from "@reducers/player";
import { screen_breakpoint_px } from "@client/lib/constants";
import { setMenu } from "@client/state/reducers/mediaMenu";
import { useBackNavigate } from "@client/hooks/useBackNavigate";
import { useDispatch, useSelector } from "react-redux";
import { useId } from "@hooks/useObjectId";
import { useLongPress } from "@hooks/useLongPress";
import { useMenu } from "@hooks/useMenu";
import { useNavigate } from "react-router-dom";
import { usePrevious } from "@client/hooks/usePrevious";
import { useState } from "react";
import { useViewport } from "@client/hooks/useViewport";

interface MediaTileProps {
  tile_type: MediaMatch;
  // Fix: This file is not really GroupedMedia. This is because the return
  // fields in the projection don't account for the type. See
  // MediaFileController
  file: GroupedMedia;
  url: (file: GroupedMedia) => string;
  displayAs: (file: GroupedMedia) => string;

  // Prevents context menu from opening during scroll
  parentScrollPosition?: number;
}

export const MediaTile = ({
  tile_type,
  file,
  url,
  displayAs,
  parentScrollPosition,
}: MediaTileProps) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { player } = useSelector(getState);
  const menu_id = useId();
  const menu = useMenu(menu_id);
  const { width } = useViewport();
  const [menu_visible, setMenuVisible] = useState(false);
  const previousParentScrollPosition = usePrevious(parentScrollPosition);

  const is_mobile = width < screen_breakpoint_px;

  // Minimize the context menu on back navigation
  useBackNavigate(
    () => is_mobile && menu_visible,
    () => {
      setMenuVisible(false);
      dispatch(setMenu(null));
    },
  );

  const onPress = useLongPress(
    () => {
      setMenuVisible(true);
      menu.set();
    },
    500,
    { mouse: false, touch: true },
    true,
  );

  if (parentScrollPosition !== previousParentScrollPosition) {
    onPress.cancelPress();
  }

  const optionsHandler: FileMenuHandler = {
    play: async () => {
      const { files, cast_info } = await getFiles(file)(player.is_casting);

      dispatch(play({ files, cast_info, index: 0 }));
    },
    getFiles: getFiles(file),
    toggle: setMenuVisible,
  };

  // TODO: This is ugly, will TS allow these to be conditional children?
  const getFileMenuChildren = () => {
    const children: [boolean, JSX.Element][] = [
      [
        tile_type === MediaMatch.Artist,
        <div key="artist" onClick={() => navigate(artistUrl(file))}>
          Go to Artist
        </div>,
      ],
      [
        tile_type === MediaMatch.Album,
        <div key="album" onClick={() => navigate(albumUrl(file))}>
          Go to Album
        </div>,
      ],
      [
        tile_type === MediaMatch.Genre,
        <div
          key="genre"
          onClick={() => navigate(matchUrl(MediaMatch.Genre)(file))}
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
        onClick={() => navigate(url(file))}
      >
        {file.image && (
          <img
            src={`/api/v1/media/cover/${file.image}?size=176`}
            loading="lazy"
          />
        )}

        <div className={"more" + (menu_visible ? " active" : "")}>
          <div className="play" onClick={noPropagate(optionsHandler.play)}>
            <Icon
              className="play-icon"
              icon={faPlayCircle}
              size="sm"
              pull="right"
            />
          </div>

          <FileMenu
            menu_id={menu_id}
            title={getFileMenuTitle(tile_type, file) ?? ""}
            handler={optionsHandler}
          >
            {getFileMenuChildren()}
          </FileMenu>
        </div>
      </div>
      <div className="display-as">{displayAs(file)}</div>
    </div>
  );
};

/**
 * Get the title for the tile menu
 *
 * @param tile_type - type of media tile, e.g. artist, album, genre
 * @param file - file data
 * @returns file menu title
 */
const getFileMenuTitle = (tile_type: MediaMatch, file: GroupedMedia) => {
  switch (tile_type) {
    case MediaMatch.Artist:
      return file.artist;
    case MediaMatch.Album:
      return `${file.album} (${file.year})`;
    case MediaMatch.Genre:
      return file.genre;
    default:
      return "File Menu";
  }
};

const getSortString = (file: Media) =>
  (file.artist ?? "") +
  (file.album ?? "") +
  (file.track ?? "").toString().padStart(3, "0");

export const getFiles =
  (group: GroupedMedia) =>
  async (is_casting = false) => {
    // TODO: The controller used here has an issue with the type
    // e.g. duration is not available but the type thinks it's valid
    const files = (await MediaApi.query(group._id)).sort((a, b) =>
      getSortString(a).localeCompare(getSortString(b)),
    );

    if (!is_casting) {
      return { files, cast_info: null };
    }

    const cast_info = await client.media.castInfo.query({
      media_ids: files.map((file) => file._id),
    });

    return { files, cast_info };
  };
