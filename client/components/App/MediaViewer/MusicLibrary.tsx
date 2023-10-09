import "./MusicLibrary.scss";
import * as _ from "lodash-es";
import { Action, fetchReducer } from "@hooks/index";
import { ApiMap } from "@client/api/MediaApi";
import { GroupedMedia } from "@common/types";
import { MediaMatch } from "@common/media/types";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { Select } from "../../ui/Select";
import { SmartScroller } from "./SmartScroller";
import { getState } from "@client/state/reducers/store";
import { matchUrl } from "@client/lib/url";
import { play } from "@reducers/player";
import { useDispatch, useSelector } from "react-redux";
import { useReducer, useState } from "react";
import { getRandomFiles } from "@client/lib/PlayerTools";
import { PlayMode } from "@reducers/player.types";

interface MusicLibraryProps {
  setLoading: (loading: boolean) => void;
  per_page: number;
}

export const MusicLibrary = ({ setLoading, per_page }: MusicLibraryProps) => {
  const dispatch = useDispatch();
  const { player } = useSelector(getState);

  const [match, setMatch] = useState<MediaMatch>(MediaMatch.Artist);

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

    const play_options = { mode: PlayMode.Random, complete: false };
    dispatch(play({ files, play_options, cast_info, index: 0 }));
  };

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
        mediaDispatch={mediaDispatch}
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
