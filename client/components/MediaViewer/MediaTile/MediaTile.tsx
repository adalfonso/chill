import "./MediaTile.scss";
import React, { useEffect, useState } from "react";
import _ from "lodash";
import { Media } from "@common/autogen";
import { useHistory } from "react-router-dom";
import { useMultiClick } from "@client/hooks/useMultiClick";
export interface TileData extends Partial<Media> {
  _id: string[];
  _count: number;
}

interface MediaTileProps {
  file: TileData;
  url: (file: TileData) => string;
  displayAs: (file: TileData) => string;
  use: (file: TileData) => void;
  load_cover: boolean;
}

export const MediaTile = ({
  file,
  url,
  use,
  displayAs,
  load_cover = false,
}: MediaTileProps) => {
  const history = useHistory();
  const [cover, setCover] = useState("");

  useEffect(() => {
    if (load_cover && file.artist !== undefined) {
      const query = ["artist", "album"]
        .filter((key) => file[key] !== undefined)
        .map((key) => `${key}=${file[key]}`)
        .join("&");

      setCover(`/media/cover?${query}`);
    }
  }, []);

  const handleClick = useMultiClick(
    // single click
    () => history.push(url(file)),
    // double click
    () => use(file),
    200,
  );

  return (
    <div className="media-tile" onClick={handleClick}>
      {cover && <img src={cover} alt="" />}
      <div>{displayAs(file)}</div>
    </div>
  );
};
