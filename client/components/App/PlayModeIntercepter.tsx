import { Media } from "@common/models/Media";
import { PlayMode } from "@reducers/player.types";
import { PlaylistApi } from "@client/api/PlaylistApi";
import { addToQueue, PlayerState, updatePlayOptions } from "@reducers/player";
import { getRandomFiles } from "@client/lib/PlayerTools";
import { getState } from "@reducers/store";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { client } from "@client/client";

interface PlayModeIterceptorProps {
  children?: JSX.Element | JSX.Element[];
}

export const PlayModeIterceptor = ({ children }: PlayModeIterceptorProps) => {
  const [busy, setBusy] = useState(false);
  const { player } = useSelector(getState);
  const dispatch = useDispatch();

  const queueMoreTracks = async (getTracks: () => Promise<Media[]>) => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const files = await getTracks();

      const cast_info = player.is_casting
        ? await client.media.castInfo.query({
            media_ids: files.map((file) => file._id),
          })
        : null;

      dispatch(addToQueue({ files, cast_info }));

      if (player.play_options.mode === PlayMode.Playlist) {
        dispatch(
          updatePlayOptions({
            ...player.play_options,
            page: player.play_options.page + 1,
            complete: files.length === 0,
          }),
        );
      } else if (player.play_options.mode === PlayMode.Random) {
        dispatch(
          updatePlayOptions({
            ...player.play_options,
            complete: files.length === 0,
          }),
        );
      }
    } catch (e) {
      console.error(`Failed to add more ${player.play_options.mode} files:`, e);
    }

    setBusy(false);
  };

  const next_batch_offset = 6;

  const { complete } = player.play_options;

  if (!complete && player.playlist.length - player.index < next_batch_offset) {
    switch (player.play_options.mode) {
      case PlayMode.Random:
        queueMoreTracks(getMoreRandomTracks(player));
        break;
      case PlayMode.Playlist:
        queueMoreTracks(getMorePlaylistTracks(player));
        break;
      default:
    }
  }

  return <>{children}</>;
};

const getMoreRandomTracks = (player: PlayerState) => async () => {
  // Appease TypeScript
  if (player.play_options.mode !== PlayMode.Random) {
    return [];
  }

  const exclusions = player.playlist.map((file) => file._id);
  const { files } = await getRandomFiles(player.is_casting, exclusions);

  return files;
};

const getMorePlaylistTracks = (player: PlayerState) => async () => {
  const { play_options } = player;

  // Appease TypeScript
  if (play_options.mode !== PlayMode.Playlist) {
    return [];
  }

  const { id, page, limit } = play_options;

  return PlaylistApi.tracks(id, { page: page + 1, limit });
};
