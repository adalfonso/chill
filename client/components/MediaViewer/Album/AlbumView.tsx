import "./AlbumView.scss";
import React, { useState, useEffect } from "react";
import { AlbumViewRow } from "./AlbumView/AlbumViewRow";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { play } from "@client/state/reducers/playerReducer";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";

interface AlbumViewProps {
  setLoading: (loading: boolean) => void;
}

type AlbumParams = {
  album: string;
};

export const AlbumView = ({ setLoading }: AlbumViewProps) => {
  const album = decodeURIComponent(useParams<AlbumParams>().album);
  const [files, setFiles] = useState<Media[]>([]);
  const dispatch = useDispatch();

  const playAll =
    (index = 0) =>
    () => {
      dispatch(play({ files: [...files], index }));
    };

  useEffect(() => {
    setLoading(true);

    MediaApi.query({ album })
      .then((res) => {
        setFiles(res.data);
      })
      .catch((_err) => {
        console.error("Failed to load album tracks data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [album]);

  const artists = () => [...new Set(files.map((file) => file.artist))];
  const getYear = () => [...new Set(files.map((file) => file.year))].join(",");

  return (
    <div id="media-viewer">
      <div className="album-view">
        <div className="details">
          {files?.[0]?.cover?.filename && (
            <img
              src={`/media/cover/${files[0].cover.filename}?size=128`}
              loading="lazy"
            />
          )}
          <div className="info">
            <h2>{artists().length > 1 ? "Various Artists" : artists()[0]}</h2>
            {artists().length > 1 && <h4>{artists().join(",  ")}</h4>}
            <h4>{album}</h4>
            <h4>{getYear()}</h4>
          </div>
        </div>

        <div className="panel-list">
          <div className="header track"></div>
          <div className="header"></div>
          <div className="header align-right"></div>

          {files
            .sort((a, b) => a.track - b.track)
            .map((file, index) => {
              return (
                <AlbumViewRow
                  index={index}
                  file={file}
                  playAll={playAll}
                ></AlbumViewRow>
              );
            })}
        </div>
      </div>
    </div>
  );
};
