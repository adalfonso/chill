import "./MusicLibrary.scss";
import React, { useReducer, useRef, useState } from "react";
import _ from "lodash";
import { Action, fetchReducer, useFetch } from "@client/hooks/useFetch";
import { AxiosResponse } from "axios";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch as Match } from "@common/media/types";
import { MediaTile, TileData } from "./MusicLibrary/MediaTile";
import { PaginationOptions } from "@common/types";
import { Select } from "../../ui/Select";
import {
  PageAction,
  pageReducer,
  useInfiniteScroll,
} from "@hooks/useInfiniteScroll";

const ApiMap: Record<
  Match,
  (options?: PaginationOptions) => Promise<AxiosResponse>
> = {
  [Match.Artist]: MediaApi.getGroupedByArtist,
  [Match.Album]: MediaApi.getGroupedByAlbum,
  [Match.Genre]: MediaApi.getGroupedByGenre,
  [Match.Path]: () => Promise.resolve(null),
};

type FetchedMedia = Media & {
  _id: string[];
  _count: number;
};
interface MusicLibraryProps {
  setLoading: (loading: boolean) => void;
  per_page: number;
}

export const MusicLibrary = ({ setLoading, per_page }: MusicLibraryProps) => {
  const bottomBoundaryRef = useRef(null);
  const [match, setMatch] = useState<Match>(Match.Artist);
  const [pager, pagerDispatch] = useReducer(pageReducer, { page: 0 });
  const [mediaData, imgDispatch] = useReducer(fetchReducer<FetchedMedia>, {
    items: [],
    busy: true,
  });

  // Change the media match drop down
  const changeMediaMatch = (match: Match) => {
    imgDispatch({ type: Action.Reset });
    pagerDispatch({ type: PageAction.Reset });
    setMatch(match);
  };

  // Cause media files to reload
  const loadMediaFiles = (match: Match) => {
    setLoading(true);

    return ApiMap[match]({ page: pager.page, limit: per_page });
  };

  const displayAs = (file: TileData) => file[match];
  const url = (file: TileData) =>
    `/${match}/${encodeURIComponent(file[match])}`;

  useInfiniteScroll(bottomBoundaryRef, pagerDispatch);

  // make API calls
  useFetch<FetchedMedia>(
    pager,
    imgDispatch,
    () => loadMediaFiles(match).then((res) => res.data),
    () => setLoading(false),
  );

  return (
    <>
      <div className="music-library">
        <div className="library-tools">
          <Select
            onChange={changeMediaMatch}
            displayAs={_.capitalize(match)}
            value={match}
          >
            {Object.values(_.omit(Match, "Path")).map((option) => {
              return (
                <option key={option} value={option}>
                  {_.capitalize(option)}
                </option>
              );
            })}
          </Select>
        </div>
      </div>
      <div id="media-viewer">
        <div className="media-tiles">
          {mediaData.items
            .sort((a, b) => a[match].localeCompare(b[match]))
            .map((file) => (
              <MediaTile
                key={JSON.stringify(file._id)}
                file={file}
                displayAs={displayAs}
                url={url}
              />
            ))}
        </div>
        <div id="page-bottom-boundary" ref={bottomBoundaryRef}></div>
      </div>
    </>
  );
};
