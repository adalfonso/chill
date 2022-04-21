import "./MediaTile.scss";
import * as React from "react";
import { useHistory } from "react-router-dom";

interface MediaTileProps {
  file: { _id: string };
  type: string;
}

export const MediaTile = ({ file, type }: MediaTileProps) => {
  const history = useHistory();

  return (
    <div
      className="media-tile"
      key={file._id}
      onClick={() => history.push(`/${type}/${file._id}`)}
    >
      <div>{file._id}</div>
    </div>
  );
};
