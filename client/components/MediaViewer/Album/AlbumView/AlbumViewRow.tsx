import React, { useState, MouseEvent } from "react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/autogen";
import { RootState } from "@client/state/reducers/store";
import { faPlayCircle, faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import { play } from "@client/state/reducers/playerReducer";
import { useDispatch, useSelector } from "react-redux";
import { secondsToMinutes } from "@client/util";

export interface AlbumViewRowProps {
  file: Media;
  index: number;
  playAll: (index: number) => () => void;
}

export const AlbumViewRow = ({ file, index, playAll }: AlbumViewRowProps) => {
  const [showOptions, setShowOptions] = useState(false);
  const player = useSelector((state: RootState) => state.player);
  const dispatch = useDispatch();

  const onPlay = (files: Media[], index = 0) => {
    dispatch(play({ files: [...files], index }));
  };

  const onOptionsClick = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setShowOptions(!showOptions);
  };

  const optionsHandler = {
    play: () => {
      playAll(index);
      setShowOptions(false);
    },
  };

  return (
    <div className="row" onClick={playAll(index)} key={file.path}>
      <div className="track">
        {file.track}
        {player?.now_playing?.path === file.path && (
          <Icon
            className="play-icon"
            icon={faPlayCircle}
            size="sm"
            pull="right"
          />
        )}
      </div>
      <div>{file.title}</div>
      <div className={"tail" + (showOptions ? " show-options" : "")}>
        <div className="duration mono">{secondsToMinutes(file.duration)}</div>
        <div className="more" onClick={onOptionsClick}>
          <Icon icon={faEllipsisV} pull="right" />
        </div>
        {showOptions && (
          <section className="file-options">
            <div onClick={optionsHandler.play}>Play</div>
          </section>
        )}
      </div>
    </div>
  );
};
