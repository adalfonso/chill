import "./AlbumView.scss";
import React, { useState, useEffect } from "react";
import { AlbumViewRow } from "./AlbumView/AlbumViewRow";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { play } from "@reducers/player";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { useQuery } from "@hooks/useQuery";

interface AlbumViewProps {
  setLoading: (loading: boolean) => void;
}

type AlbumParams = {
  album: string;
};

export const AlbumView = ({ setLoading }: AlbumViewProps) => {
  const album = decodeURIComponent(useParams<AlbumParams>().album);
  const artist = useQuery().get("artist");
  const no_album = useQuery().get("no_album") === "1";
  const [files, setFiles] = useState<Media[]>([]);
  const dispatch = useDispatch();

  const playAll =
    (index = 0) =>
    () => {
      dispatch(play({ files: [...files], index }));
    };

  useEffect(() => {
    setLoading(true);

    MediaApi.query({
      album: no_album ? null : album,
      artist: artist ?? undefined,
    })
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
      <div className="album-view wide">
        <div className="details">
          <div className="album-art">
            {files?.[0]?.cover?.filename && (
              <img
                src={`/api/v1/media/cover/${files[0].cover.filename}?size=160`}
                loading="lazy"
              />
            )}
          </div>

          <div className="info">
            <h2>{artists().length > 1 ? "Various Artists" : artists()[0]}</h2>
            {artists().length > 1 && <h4>{artists().join(",  ")}</h4>}
            <h4>{album}</h4>
            <h4>{getYear()}</h4>
            <div className="play-button" onClick={() => playAll()()}>
              <Icon icon={faPlayCircle} size="sm" pull="right" />
              Play
            </div>
          </div>
        </div>

        <div className="panel-list">
          <div className="header track"></div>
          <div className="header"></div>
          <div className="header align-right"></div>

          {files
            .sort((a, b) => a.track - b.track)
            .map((file, index) => (
              <AlbumViewRow
                index={index}
                file={file}
                playAll={playAll}
                key={file._id.toString()}
              ></AlbumViewRow>
            ))}
        </div>
      </div>
    </div>
  );
};
