import "./MediaTile.scss";
import * as React from "react";
import { Media } from "@common/autogen";
import { useHistory } from "react-router-dom";
import { useMultiClick } from "@client/hooks/useMultiClick";
export interface TileData extends Partial<Media> {
  _id: string[];
  _group_by: string[];
  _count: number;
}

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
      <div>{displayAs(file)}</div>
    </div>
  );
};
