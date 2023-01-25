import { Dispatch, useEffect } from "react";
import { Pager } from "./useInfiniteScroll";

export enum Action {
  Stack,
  Fetch,
  Release,
  Reset,
}

interface FetchState<T> {
  items: T[];
  busy: boolean;
}

interface FetchAction<T> {
  type: Action;
  items?: T[];
}

export const fetchReducer = <T>(
  state: FetchState<T>,
  action: FetchAction<T>,
) => {
  switch (action.type) {
    case Action.Stack:
      return { ...state, items: state.items.concat(action.items ?? []) };
    case Action.Fetch:
      return { ...state, busy: true };
    case Action.Release:
      return { ...state, busy: false };
    case Action.Reset:
      return { ...state, busy: false, items: [] };
    default:
      return state;
  }
};

/**
 * Facilitates the fetching and updating of data
 *
 * @param data pagination data
 * @param dispatch dispatcher
 * @param api api that returns data
 * @param onDone optional callback
 */
export const useFetch = <T>(
  data: Pager,
  dispatch: Dispatch<FetchAction<T>>,
  api: () => Promise<T[]>,
  onDone?: () => void,
) => {
  // make API calls
  useEffect(() => {
    dispatch({ type: Action.Fetch });
    api()
      .then((items) => {
        dispatch({ type: Action.Stack, items });
      })
      .finally(() => {
        dispatch({ type: Action.Release });
        onDone?.();
      });
  }, [data.page]);
};
