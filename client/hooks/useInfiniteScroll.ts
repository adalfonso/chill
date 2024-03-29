import { Dispatch, RefObject, useCallback, useEffect, useState } from "react";
import { ObjectValues } from "@common/types";

export const PageAction = {
  Advance: "advance",
  Reset: "reset",
} as const;

export type PageAction = ObjectValues<typeof PageAction>;

export interface Pager {
  page: number;
}

export interface PageDispatchAction {
  type: PageAction;
}

export const pageReducer = (state: Pager, action: PageDispatchAction) => {
  switch (action.type) {
    case PageAction.Advance:
      return { ...state, page: state.page + 1 };
    case PageAction.Reset:
      return { ...state, page: 0 };
    default:
      return state;
  }
};

/**
 * Facilitate infinite scroll
 *
 * @param scroll_ref reference to scroll tracking element
 * @param dispatch page dispatcher
 */
export const useInfiniteScroll = (
  scroll_ref: RefObject<HTMLElement>,
  dispatch: Dispatch<PageDispatchAction>,
) => {
  const [is_ready, setIsReady] = useState(false);

  useEffect(() => {
    // Delay the infinite scroll to reduce the chance of a race condition
    // between the first two page
    setTimeout(() => setIsReady(true), 250);
  }, []);

  const scrollObserver = useCallback(
    (node: Element) => {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          is_ready &&
            en.intersectionRatio > 0 &&
            dispatch({ type: PageAction.Advance });
        });
      }).observe(node);
    },
    [dispatch, is_ready],
  );

  useEffect(() => {
    if (scroll_ref?.current) {
      scrollObserver(scroll_ref.current);
    }
  }, [scrollObserver, scroll_ref]);
};
