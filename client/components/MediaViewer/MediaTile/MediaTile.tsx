import "./MediaTile.scss";
import React from "react";
import { Media } from "@common/autogen";
import { useHistory } from "react-router-dom";
import { useMultiClick } from "@client/hooks/useMultiClick";
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

  const handleClick = useMultiClick(
    // single click
    () => history.push(url(file)),
    // double click
    () => use(file),
    200,
  );

  return (
    <div className="media-tile" onClick={handleClick}>
      {file.image && (
        <img src={`/media/cover/${file.image}?size=256`} loading="lazy" />
      )}
      <div>{displayAs(file)}</div>
    </div>
  );
};
