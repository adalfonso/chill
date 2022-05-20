import { Dispatch, MutableRefObject, useCallback, useEffect } from "react";

export enum PageAction {
  Advance,
  Reset,
}

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
  scroll_ref: MutableRefObject<HTMLElement>,
  dispatch: Dispatch<PageDispatchAction>,
) => {
  const scrollObserver = useCallback(
    (node) => {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          en.intersectionRatio > 0 && dispatch({ type: PageAction.Advance });
        });
      }).observe(node);
    },
    [dispatch],
  );

  useEffect(() => {
    if (scroll_ref.current) {
      scrollObserver(scroll_ref.current);
    }
  }, [scrollObserver, scroll_ref]);
};
