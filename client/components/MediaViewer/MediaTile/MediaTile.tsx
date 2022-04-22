import "./MediaTile.scss";
import * as React from "react";
import { useHistory } from "react-router-dom";
export interface TileData {
  _id: string[];
  _group_by: string[];
  _count: number;
}

interface MediaTileProps {
  file: TileData;
  url: (file: TileData) => string;
  displayAs: (file: TileData) => string;
}

export const MediaTile = ({ file, url, displayAs }: MediaTileProps) => {
  const history = useHistory();

  return (
    <div className="media-tile" onClick={() => history.push(url(file))}>
      <div>{displayAs(file)}</div>
    </div>
  );
};
