import { Media } from "@common/autogen";
import { Dispatch, useEffect } from "react";

type FetchMedia = Media & {
  _id: string[];
  _count: number;
};

export enum MediaAction {
  Stack,
  Fetch,
  Release,
  Reset,
}

interface MediaFetchState {
  media: FetchMedia[];
  busy: boolean;
}

interface MediaDispatchAction {
  type: MediaAction;
  media?: FetchMedia[];
}

export const mediaReducer = (
  state: MediaFetchState,
  action: MediaDispatchAction,
) => {
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

/**
 * Facilitates the fetching and updating of media
 *
 * @param data pagination data
 * @param dispatch dispatcher
 * @param api api that returns media
 * @param onDone optional callback
 */
export const useFetch = (
  data,
  dispatch: Dispatch<MediaDispatchAction>,
  api: () => Promise<FetchMedia[]>,
  onDone?: () => void,
) => {
  // make API calls
  useEffect(() => {
    dispatch({ type: MediaAction.Fetch });
    api()
      .then((media) => {
        dispatch({ type: MediaAction.Stack, media });
      })
      .finally(() => {
        dispatch({ type: MediaAction.Release });
        onDone?.();
      });
  }, [data.page]);
};
