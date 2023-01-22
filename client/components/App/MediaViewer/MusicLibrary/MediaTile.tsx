import "./MediaTile.scss";
import { FileMenu } from "../FileMenu";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/models/Media";
import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch } from "@common/media/types";
import { MouseEvent as ReactMouseEvent, useState } from "react";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { play } from "@reducers/player";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

export type TileData = Partial<Omit<Media, "_id">> & {
  _id: Record<string, string>;
  _count: number;
  image?: string;
};

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
  const class_name = "media-tile" + (menu_visible ? " active" : "");

  const getSortString = (file: Media) =>
    (file.artist ?? "") +
    (file.album ?? "") +
    (file.track ?? "").toString().padStart(3, "0");

  const getFiles = async () =>
    file._count === undefined
      ? [file]
      : (await MediaApi.query(file._id)).data.sort((a, b) =>
          getSortString(a).localeCompare(getSortString(b)),
        );

  const onPlay = (e: ReactMouseEvent<HTMLElement>) => {
    e.stopPropagation();
    optionsHandler.play();
  };

  const optionsHandler = {
    play: async () => dispatch(play({ files: await getFiles(), index: 0 })),
    getFiles,
    toggle: setMenuVisible,
  };

  return (
    <div className="media-tile-wrapper">
      <div className={class_name} onClick={() => navigate(url(file))}>
        {file.image && (
          <img
            src={`/api/v1/media/cover/${file.image}?size=176`}
            loading="lazy"
          />
        )}

        <div className={"more" + (menu_visible ? " active" : "")}>
          <div className="play" onClick={onPlay}>
            <Icon
              className="play-icon"
              icon={faPlayCircle}
              size="sm"
              pull="right"
            />
          </div>

          <FileMenu
            title={getFileMenuTitle(tile_type, file)}
            handler={optionsHandler}
          ></FileMenu>
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
