import "./MusicLibrary.scss";
import * as React from "react";
import * as _ from "lodash";
import { Media } from "@common/autogen";
import { MediaApi, PaginationOptions } from "@client/api/MediaApi";
import { MediaMatch as Match } from "@common/MediaType/types";
import { MediaTile, TileData } from "./MediaTile/MediaTile";
import { Select } from "../ui/Select";
import { useReducer, useRef, useState } from "react";
import { MediaAction, mediaReducer, useFetch } from "@client/hooks/useFetch";
import {
  PageAction,
  pageReducer,
  useInfiniteScroll,
} from "@client/hooks/useInfiniteScroll";

const ApiMap: Record<Match, (options?: PaginationOptions) => Promise<unknown>> =
  {
    [Match.Artist]: MediaApi.getGroupedByArtist,
    [Match.Album]: MediaApi.getGroupedByAlbum,
    [Match.Genre]: MediaApi.getGroupedByGenre,
    [Match.Path]: () => Promise.resolve(null),
  };

interface MusicLibraryProps {
  onPlay: (files?: Media[], index?: number) => Promise<void>;
  setLoading: (loading: boolean) => void;
  per_page: number;
}

export const MusicLibrary = ({
  onPlay,
  setLoading,
  per_page,
}: MusicLibraryProps) => {
  const bottomBoundaryRef = useRef(null);
  const [match, setMatch] = useState<Match>(Match.Artist);
  const [pager, pagerDispatch] = useReducer(pageReducer, { page: 0 });
  const [mediaData, imgDispatch] = useReducer(mediaReducer, {
    media: [],
    busy: true,
  });

  // Change the media match drop down
  const changeMediaMatch = (match: Match) => {
    imgDispatch({ type: MediaAction.Reset });
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

  const use = async (file: TileData) => {
    const match_value = file[match];
    const results = await MediaApi.query({ [match]: match_value });

    onPlay(results.data);
  };

  useInfiniteScroll(bottomBoundaryRef, pagerDispatch);

  // make API calls
  useFetch(
    pager,
    imgDispatch,
    () => loadMediaFiles(match).then((res) => res.data),
    () => setLoading(false),
  );

  return (
    <>
      <div className="music-library">
        <div className="toolbar">
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
          {mediaData.media
            .sort((a, b) => a[match].localeCompare(b[match]))
            .map((file) => (
              <MediaTile
                key={JSON.stringify(file._id)}
                file={file}
                displayAs={displayAs}
                url={url}
                use={use}
              />
            ))}
        </div>
        <div id="page-bottom-boundary" ref={bottomBoundaryRef}></div>
      </div>
    </>
  );
};
