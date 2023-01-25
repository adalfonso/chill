import "./MediaTile.scss";
import { FileMenu } from "../FileMenu";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/models/Media";
import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch } from "@common/media/types";
import { TileData } from "@client/lib/types";
import { albumUrl, artistUrl, matchUrl } from "@client/lib/url";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { noPropagate } from "@client/util";
import { play } from "@reducers/player";
import { useDispatch } from "react-redux";
import { useLongPress } from "@hooks/useLongPress";
import { useMenu } from "@hooks/useMenu";
import { useNavigate } from "react-router-dom";
import { useObjectId } from "@hooks/useObjectId";
import { useState } from "react";

interface MediaTileProps {
  tile_type: MediaMatch;
  file: TileData;
  url: (file: TileData) => string;
  displayAs: (file: TileData) => string;
}

export const MediaTile = ({
  tile_type,
  file,
  url,
  displayAs,
}: MediaTileProps) => {
  const [menu_visible, setMenuVisible] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const menu_id = useObjectId();
  const menu = useMenu(menu_id);

  const onPress = useLongPress(
    () => {
      setMenuVisible(true);
      menu.set();
    },
    500,
    { mouse: false, touch: true },
  );

  const getSortString = (file: Media) =>
    (file.artist ?? "") +
    (file.album ?? "") +
    (file.track ?? "").toString().padStart(3, "0");

  const getFiles = async () =>
    file._count === undefined
      ? [file]
      : (await MediaApi.query(file._id)).data.sort((a: Media, b: Media) =>
          getSortString(a).localeCompare(getSortString(b)),
        );

  const optionsHandler = {
    play: async () => dispatch(play({ files: await getFiles(), index: 0 })),
    getFiles,
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
    <div className="media-tile-wrapper" {...onPress}>
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
const getFileMenuTitle = (tile_type: MediaMatch, file: TileData) => {
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
