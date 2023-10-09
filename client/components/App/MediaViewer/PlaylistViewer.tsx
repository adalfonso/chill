import "./MusicLibrary.scss";
import { Media } from "@common/models/Media";
import { Playlist } from "@common/models/Playlist";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { PlaylistRow } from "./Playlist/PlaylistRow";
import { SmartScroller } from "./SmartScroller";
import { fetchReducer } from "@hooks/index";
import { pagination_limit } from "@client/lib/constants";
import { play } from "@reducers/player";
import { useDispatch } from "react-redux";
import { useEffect, useReducer, useState } from "react";
import { useParams } from "react-router-dom";

type PlaylistParams = {
  id: string;
};

export const PlaylistViewer = () => {
  const id = decodeURIComponent(useParams<PlaylistParams>().id ?? "");
  const [playlist, setPlaylist] = useState<Playlist>();
  const dispatch = useDispatch();

  const playAll =
    (index = 0) =>
    () => {
      dispatch(play({ files: [...playlist_data.items], index }));
    };

  useEffect(() => {
    PlaylistApi.get(id).then(setPlaylist);
  }, [id]);

  const [playlist_data, mediaDispatch] = useReducer(fetchReducer<Media>, {
    items: [],
    busy: true,
  });

  const loadPlaylistItems = (page: number) =>
    PlaylistApi.tracks(id, { page, limit: pagination_limit });

  return (
    <>
      {/* Wait until playlist loads */}
      {playlist && (
        <SmartScroller
          className="playlist-viewer"
          header={playlist?.name}
          mediaDispatch={mediaDispatch}
          resetPagerOn={[playlist?.name ?? ""]}
          onInfiniteScroll={loadPlaylistItems}
          wrapperClassName="playlist-tracks panel-list"
        >
          {playlist_data.items?.map((file, index) => (
            <PlaylistRow
              index={index}
              file={file}
              playAll={playAll}
              key={file._id.toString()}
            ></PlaylistRow>
          ))}
        </SmartScroller>
      )}
    </>
  );
};
