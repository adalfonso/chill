import "./MusicLibrary.scss";
import * as _ from "lodash-es";
import { Action, fetchReducer } from "@hooks/useFetch";
import { ApiMap } from "@client/api/MediaApi";
import { GroupedMedia } from "@common/types";
import { MediaMatch } from "@common/media/types";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { Select } from "../../ui/Select";
import { addToQueue, play } from "@reducers/player";
import { client } from "@client/client";
import { getState } from "@client/state/reducers/store";
import { matchUrl } from "@client/lib/url";
import { useDispatch, useSelector } from "react-redux";
import { useReducer, useState } from "react";
import { SmartScroller } from "./SmartScroller";

interface MusicLibraryProps {
  setLoading: (loading: boolean) => void;
  per_page: number;
}

export const MusicLibrary = ({ setLoading, per_page }: MusicLibraryProps) => {
  const dispatch = useDispatch();
  const { player } = useSelector(getState);

  const [match, setMatch] = useState<MediaMatch>(MediaMatch.Artist);
  const [busy, setBusy] = useState(false);

  const [mediaData, mediaDispatch] = useReducer(fetchReducer<GroupedMedia>, {
    items: [],
    busy: true,
  });

  // Change the media match drop down
  const changeMediaMatch = (match: MediaMatch) => {
    mediaDispatch({ type: Action.Reset });
    setMatch(match);
  };

  // Cause media files to reload
  const loadMediaFiles = (match: MediaMatch) => (page: number) => {
    setLoading(true);

    return ApiMap[match]({ page, limit: per_page });
  };

  const displayAs = (file: GroupedMedia) => file[match] ?? "";

  const playRandomTracks = async () => {
    const { files, cast_info } = await getRandomFiles(player.is_casting);

    dispatch(play({ files, is_random: true, cast_info, index: 0 }));
  };

  const queueMoreRandomTracks = async () => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const exclusions = player.playlist.map((file) => file._id);
      const { files } = await getRandomFiles(player.is_casting, exclusions);

      dispatch(addToQueue(files));
    } catch (e) {
      console.error(`Failed to add random files:`, e);
    }

    setBusy(false);
  };

  if (player.is_random && player.playlist.length - player.index < 6) {
    queueMoreRandomTracks();
  }

  return (
    <>
      <div className="music-library">
        <div className="library-tools">
          <Select
            onChange={changeMediaMatch}
            displayAs={_.capitalize(match)}
            value={match}
          >
            {Object.values(MediaMatch).map((option) => {
              return (
                <option key={option} value={option}>
                  {_.capitalize(option)}
                </option>
              );
            })}
          </Select>
        </div>

        <div>
          <div className="link" onClick={playRandomTracks}>
            Play Random
          </div>
        </div>
      </div>

      <SmartScroller
        dispatcher={mediaDispatch}
        resetPagerOn={[match]}
        onInfiniteScroll={loadMediaFiles(match)}
        onInfiniteScrollDone={() => setLoading(false)}
      >
        {mediaData.items
          .sort((a, b) => (a[match] ?? "").localeCompare(b[match] ?? ""))
          .map((file) => (
            <MediaTile
              tile_type={match}
              key={JSON.stringify(file._id)}
              file={file}
              displayAs={displayAs}
              url={matchUrl(match)}
            />
          ))}
      </SmartScroller>
    </>
  );
};

/**
 * Get a bunch of random files and their respective cast info
 *
 * @param is_casting - if the player is casting
 * @returns files and cast info
 */
const getRandomFiles = async (
  is_casting = false,
  exclusions: string[] = [],
) => {
  const files = await client.media.queryRandom.mutate({
    options: { limit: 20, $nin: exclusions },
  });

  // Refactor: Here on out is duplicated in MediaTile
  if (!is_casting) {
    return { files, cast_info: null };
  }

  const cast_info = await client.media.castInfo.query({
    media_ids: files.map((file) => file._id),
  });

  return { files, cast_info };
};
