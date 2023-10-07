import { Dispatch, useEffect } from "react";
import { ObjectValues } from "@common/types";
import { Pager } from "./useInfiniteScroll";

export const Action = {
  Stack: "stack",
  Fetch: "fetch",
  Release: "release",
  Reset: "reset",
} as const;

export type Action = ObjectValues<typeof Action>;

interface FetchState<T> {
  items: T[];
  busy: boolean;
}

export interface FetchAction<T> {
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

type useFetchOptions<T> = {
  // pagination data
  pager: Pager;

  // data dispatch
  dispatch: Dispatch<FetchAction<T>>;

  // API that returns data
  onFetch: () => Promise<T[]>;

  // Optional onDone callback
  onDone?: () => void;
};

/**
 * Facilitates the fetching and updating of data
 *
 * @param data pagination data
 * @param dispatch dispatcher
 * @param api api that returns data
 * @param onDone optional callback
 */
export const useFetch = <T>({
  pager,
  dispatch,
  onFetch,
  onDone,
}: useFetchOptions<T>) => {
  // make API calls
  useEffect(() => {
    dispatch({ type: Action.Fetch });
    onFetch()
      .then((items) => {
        dispatch({ type: Action.Stack, items });
      })
      .finally(() => {
        dispatch({ type: Action.Release });
        onDone?.();
      });
  }, [pager.page]);
};
