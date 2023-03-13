import "./AlbumView.scss";
import { AlbumViewRow } from "./AlbumView/AlbumViewRow";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { Media } from "@common/models/Media";
import { MediaApi } from "@client/api/MediaApi";
import { client } from "@client/client";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { getState } from "@client/state/reducers/store";
import { play } from "@reducers/player";
import { truncate } from "lodash-es";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useQuery } from "@hooks/useQuery";
import { useState, useEffect } from "react";

interface AlbumViewProps {
  setLoading: (loading: boolean) => void;
}

type AlbumParams = {
  album: string;
};

export const AlbumView = ({ setLoading }: AlbumViewProps) => {
  const album = decodeURIComponent(useParams<AlbumParams>().album ?? "");
  const { caster } = useSelector(getState);
  const artist = useQuery().get("artist");
  const no_album = useQuery().get("no_album") === "1";
  const [files, setFiles] = useState<Media[]>([]);
  const dispatch = useDispatch();

  const playAll =
    (index = 0) =>
    async () => {
      const is_casting = caster.is_casting;
      const cast_info = is_casting
        ? await client.media.castInfo.query({
            media_ids: files.map((file) => file._id),
          })
        : null;

      dispatch(play({ files: [...files], cast_info, index }));
    };

  useEffect(() => {
    setLoading(true);

    const match = {
      album: no_album ? null : album,
      artist: artist ?? undefined,
    };

    if (match.artist === undefined) {
      delete match.artist;
    }

    MediaApi.query(match)
      .then(setFiles)
      .catch(({ message }) =>
        console.error("Failed to load album tracks data:", message),
      )
      .finally(() => setLoading(false));
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
            {artists().length > 1 && (
              <h4 title={artists().join(",  ")}>
                {truncate(artists().join(",  "), { length: 72 })}
              </h4>
            )}
            <h4>{truncate(album, { length: 50 })}</h4>
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
          <div className="header"></div>
          <div className="header align-right"></div>

          {files
            .sort((a, b) => (a.track ?? 0) - (b.track ?? 0))
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
