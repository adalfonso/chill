import { Album, Artist } from "@prisma/client";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useState, useEffect, useContext, useCallback } from "react";

import "./AlbumView.scss";
import { AlbumRelationalData, Maybe, PlayableTrack } from "@common/types";
import { AlbumViewRow } from "./AlbumView/AlbumViewRow";
import { AppContext } from "@client/state/AppState";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { api } from "@client/client";
import { getState } from "@client/state/reducers/store";
import { play } from "@reducers/player";
import { truncate } from "@common/commonUtils";

type AlbumParams = {
  artist_id?: string;
  album_id: string;
};

export const AlbumView = () => {
  const { is_busy } = useContext(AppContext);
  const album_id = parseInt(useParams<AlbumParams>().album_id ?? "");
  const artist_id = useParams<AlbumParams>().artist_id
    ? parseInt(useParams<AlbumParams>().artist_id ?? "")
    : undefined;
  const { player } = useSelector(getState);
  const [artist, setArtist] = useState<Maybe<Artist>>(null);
  const [album, setAlbum] = useState<Maybe<Album & AlbumRelationalData>>(null);
  const [tracks, setTracks] = useState<Maybe<Array<PlayableTrack>>>(null);
  const dispatch = useDispatch();

  const loadInfo = useCallback(() => {
    Promise.all(
      [
        artist_id && api.artist.get.query({ id: artist_id }).then(setArtist),
        api.album.get.query({ id: album_id }).then(setAlbum),
        api.track.getByAlbumAndOrArtist
          .query({ artist_id, album_id })
          .then(setTracks),
      ].filter(Boolean),
    ).finally(() => (is_busy.value = false));
  }, [album_id]);

  useEffect(loadInfo, [loadInfo]);

  const playAll =
    (index = 0) =>
    async () => {
      if (!tracks) {
        return;
      }

      const is_casting = player.is_casting;
      const cast_info = is_casting
        ? await api.track.castInfo.query({
            track_ids: tracks.map((track) => track.id) ?? [],
          })
        : null;

      dispatch(play({ tracks: [...(tracks ?? [])], cast_info, index }));
    };

  const artist_ids = () =>
    new Set(tracks?.map((track) => track.artist_id).filter(Boolean));

  const getArtistName = () => {
    return (
      // Explicitly loaded album for artist from music library/artist
      artist?.name ||
      // Loaded album and there are multiple artists
      (artist_ids().size > 1 && "Various Artists") ||
      // Loaded album but there is a single artist
      album?.artist?.name ||
      // Fallback
      "Unknown Artist"
    );
  };
  return (
    <div id="media-viewer">
      <div className="album-view wide">
        <div className="details">
          <div className="album-art">
            {album?.album_art?.filename && (
              <img
                src={`/api/v1/media/cover/${album?.album_art?.filename}?size=160`}
                loading="lazy"
              />
            )}
          </div>

          <div className="info">
            <h2>{getArtistName()}</h2>
            {artist_ids().size > 1 && (
              <h4 title={[...artist_ids()].join(",  ")}>
                {truncate([...artist_ids()].join(",  "), { length: 72 })}
              </h4>
            )}
            <h4>{truncate(album?.title ?? "", { length: 50 })}</h4>
            <h4>{album?.year}</h4>
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

          {tracks &&
            tracks
              .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
              .map((track, index) => (
                <AlbumViewRow
                  index={index}
                  track={track}
                  playAll={playAll}
                  key={track.id.toString()}
                ></AlbumViewRow>
              ))}
        </div>
      </div>
    </div>
  );
};
