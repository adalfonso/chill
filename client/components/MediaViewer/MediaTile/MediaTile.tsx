import "./MediaTile.scss";
import React, { useState } from "react";
import _ from "lodash";
import { Media } from "@common/autogen";
import { useHistory } from "react-router-dom";
import { useMultiClick } from "@client/hooks/useMultiClick";
export interface TileData extends Partial<Media> {
  _id: string[];
  _count: number;
  image?: string;
}

interface MediaTileProps {
  file: TileData;
  url: (file: TileData) => string;
  displayAs: (file: TileData) => string;
  use: (file: TileData) => void;
  load_cover?: boolean;
}

export const MediaTile = ({
  file,
  url,
  use,
  displayAs,
  load_cover = false,
}: MediaTileProps) => {
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
      {load_cover && file.image && (
        <img src={`/media/cover/${file.image}`} alt="" />
      )}
      <div>{displayAs(file)}</div>
    </div>
  );
};
