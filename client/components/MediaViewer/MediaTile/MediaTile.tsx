import "./MediaTile.scss";
import React, { MouseEvent } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/autogen";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router-dom";

export type TileData = Partial<Media> & {
  _id: string[];
  _count: number;
  image?: string;
};

interface MediaTileProps {
  file: TileData;
  url: (file: TileData) => string;
  displayAs: (file: TileData) => string;
  use: (file: TileData) => void;
}

export const MediaTile = ({ file, url, use, displayAs }: MediaTileProps) => {
  const history = useHistory();

  const onPlay = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    use(file);
  };

  return (
    <div className="media-tile-wrapper">
      <div className="media-tile" onClick={() => history.push(url(file))}>
        {file.image && (
          <img src={`/media/cover/${file.image}?size=256`} loading="lazy" />
        )}

        <div className="more">
          <div className="play" onClick={onPlay}>
            <Icon
              className="play-icon"
              icon={faPlayCircle}
              size="sm"
              pull="right"
            />
          </div>
        </div>
      </div>
      <div className="display-as">{displayAs(file)}</div>
    </div>
  );
};
