import "./MediaTile.scss";
import React, { MouseEvent, useState } from "react";
import { FileMenu } from "../FileMenu";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import {
  addToQueue,
  play,
  playNext,
} from "@client/state/reducers/playerReducer";

export type TileData = Partial<Media> & {
  _id: string[];
  _count: number;
  image?: string;
};

interface MediaTileProps {
  file: TileData;
  url: (file: TileData) => string;
  displayAs: (file: TileData) => string;
}

export const MediaTile = ({ file, url, displayAs }: MediaTileProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const history = useHistory();
  const dispatch = useDispatch();

  const getSortString = (file: Media) =>
    file.artist ??
    "" + file.album ??
    "" + (file.track ?? "").toString().padStart(3, "0");

  const getFiles = async () =>
    file._count === undefined
      ? [file]
      : (await MediaApi.query(file._id)).data.sort((a, b) =>
          getSortString(a).localeCompare(getSortString(b)),
        );

  const onPlay = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    optionsHandler.play();
  };

  const optionsHandler = {
    play: async () => dispatch(play({ files: await getFiles(), index: 0 })),
    playNext: async () => dispatch(playNext({ files: await getFiles() })),
    addToQueue: async () => dispatch(addToQueue({ files: await getFiles() })),
    toggle: (visible: boolean) => setShowMenu(visible),
  };

  return (
    <div className="media-tile-wrapper">
      <div className="media-tile" onClick={() => history.push(url(file))}>
        {file.image && (
          <img src={`/media/cover/${file.image}?size=256`} loading="lazy" />
        )}

        <div className={"more" + (showMenu ? " active" : "")}>
          <div className="play" onClick={onPlay}>
            <Icon
              className="play-icon"
              icon={faPlayCircle}
              size="sm"
              pull="right"
            />
          </div>

          <FileMenu handler={optionsHandler}></FileMenu>
        </div>
      </div>
      <div className="display-as">{displayAs(file)}</div>
    </div>
  );
};
