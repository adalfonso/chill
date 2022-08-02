import "./MusicLibrary.scss";
import React, { useEffect, useState } from "react";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { PlaylistObject } from "@common/autogen";
import { secondsToMinutes } from "@client/util";
import { useParams } from "react-router-dom";

interface PlaylistProps {}

type PlaylistParams = {
  id: string;
};

export const Playlist = ({}: PlaylistProps) => {
  const id = decodeURIComponent(useParams<PlaylistParams>().id);
  const [tracks, setTracks] = useState([]);
  const [playlist, setPlaylist] = useState<PlaylistObject>();

  useEffect(() => {
    Promise.all([PlaylistApi.read(id), PlaylistApi.tracks(id)]).then(
      ([playlist, tracks]) => {
        setPlaylist(playlist.data);
        setTracks(tracks.data);
      },
    );
  }, [id]);

  return (
    <div id="media-viewer">
      <div className="playlist-viewer">
        <h1>{playlist?.name}</h1>

        <div className="playlist-tracks panel-list">
          {tracks?.map((track, index) => (
            <div className="row">
              <div>{index + 1}</div>
              <div>
                {track.cover?.filename && (
                  <img
                    src={`/media/cover/${track.cover.filename}?size=36`}
                    loading="lazy"
                  />
                )}
              </div>
              <div>{track.title}</div>
              <div>{track.artist}</div>
              <div>{secondsToMinutes(track.duration)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
