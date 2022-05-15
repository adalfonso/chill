import "./MusicLibrary.scss";
import * as React from "react";
import * as _ from "lodash";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch as Match } from "@common/MediaType/types";
import { MediaTile, TileData } from "./MediaTile/MediaTile";
import { Select } from "../ui/Select";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

const ApiMap: Record<Match, () => Promise<unknown>> = {
  [Match.Artist]: MediaApi.getGroupedByArtist,
  [Match.Album]: MediaApi.getGroupedByAlbum,
  [Match.Genre]: MediaApi.getGroupedByGenre,
};

interface MusicLibraryProps {
  onPlay: (files: Media[]) => Promise<void>;
  setLoading: (loading: boolean) => void;
  per_page: number;
}

enum PageAction {
  Advance,
  Reset,
}

enum MediaAction {
  Stack,
  Fetch,
  Release,
  Reset,
}

const pageReducer = (state, action) => {
  switch (action.type) {
    case PageAction.Advance:
      return { ...state, page: state.page + 1 };
    case PageAction.Reset:
      return { ...state, page: 0 };
    default:
      return state;
  }
};

const mediaReducer = (state, action) => {
  switch (action.type) {
    case MediaAction.Stack:
      return { ...state, media: state.media.concat(action.media) };
    case MediaAction.Fetch:
      return { ...state, busy: true };
    case MediaAction.Release:
      return { ...state, busy: false };
    case MediaAction.Reset:
      return { ...state, busy: false, media: [] };
    default:
      return state;
  }
};

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

  const changeMediaMatch = (value) => {
    imgDispatch({ type: MediaAction.Reset });
    pagerDispatch({ type: PageAction.Reset });
    setMatch(value);
  };

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

  const scrollObserver = useCallback(
    (node) => {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          en.intersectionRatio > 0 &&
            pagerDispatch({ type: PageAction.Advance });
        });
      }).observe(node);
    },
    [pagerDispatch],
  );

  useEffect(() => {
    bottomBoundaryRef.current && scrollObserver(bottomBoundaryRef.current);
  }, [scrollObserver, bottomBoundaryRef]);

  // make API calls
  useEffect(() => {
    imgDispatch({ type: MediaAction.Fetch });
    loadMediaFiles(match)
      .then((res) => res.data)
      .then((media) => {
        imgDispatch({ type: MediaAction.Stack, media });
      })
      .finally(() => {
        imgDispatch({ type: MediaAction.Release });
        setLoading(false);
      });
  }, [pager.page]);

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
