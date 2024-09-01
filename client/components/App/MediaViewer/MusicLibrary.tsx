import { useDispatch, useSelector } from "react-redux";
import { useState } from "preact/hooks";

import "./MusicLibrary.scss";
import { MediaTile } from "./MusicLibrary/MediaTile";
import { MediaTileData, MediaTileType } from "@common/types";
import { PlayMode } from "@reducers/player.types";
import { Select } from "../../ui/Select";
import { SmartScroller } from "./SmartScroller";
import { api } from "@client/client";
import { getRandomTracks } from "@client/lib/PlayerTools";
import { getState } from "@client/state/reducers/store";
import { matchUrl } from "@client/lib/url";
import { paginate } from "@common/pagination";
import { play } from "@reducers/player";
import { capitalize } from "@common/commonUtils";

export const MusicLibrary = () => {
  const dispatch = useDispatch();
  const { player } = useSelector(getState);

  const [match, setMatch] = useState<MediaTileType>(MediaTileType.Artist);

  // Change the media match drop down
  const changeMediaMatch = (match: MediaTileType) => {
    setMatch(match);
  };

  // Cause media files to reload
  const loadMediaFiles =
    (match: MediaTileType) =>
    (page: number): Promise<Array<MediaTileData>> =>
      api[match].getTiles.query({
        options: paginate({ page }),
      });

  const playRandomTracks = async () => {
    const tracks = await getRandomTracks();

    const cast_info = player.is_casting
      ? await api.track.castInfo.query({
          track_ids: tracks.map((file) => file.id),
        })
      : null;

    const play_options = { mode: PlayMode.Random, more: true };
    dispatch(play({ tracks: tracks, play_options, cast_info, index: 0 }));
  };

  return (
    <>
      <div className="music-library">
        <div className="library-tools">
          <Select
            onChange={changeMediaMatch}
            displayAs={capitalize(match)}
            value={match}
          >
            {Object.values(MediaTileType).map((option) => {
              return (
                <option key={option} value={option}>
                  {capitalize(option)}
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
        dependencies={[match]}
        onScroll={loadMediaFiles(match)}
        makeItems={makeItems(match)}
      ></SmartScroller>
    </>
  );
};

const makeItems = (match: MediaTileType) => (tiles: Array<MediaTileData>) =>
  tiles
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((tile) => (
      <MediaTile
        tile_type={match}
        key={JSON.stringify(tile.id)}
        tile_data={tile}
        displayAs={(item: MediaTileData) => item.name ?? ""}
        url={(item: MediaTileData) => matchUrl(match)(item.id)}
      />
    ));
