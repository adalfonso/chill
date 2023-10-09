import {
  useScroll,
  PageAction,
  pageReducer,
  useInfiniteScroll,
  FetchAction,
  useFetch,
} from "@hooks/index";
import {
  useState,
  useRef,
  cloneElement,
  useReducer,
  Dispatch,
  useEffect,
} from "react";

interface SmartScrollProps<T> {
  // Header text
  header?: string;

  // CSS class name for container
  className?: string;

  // CSS class name for tile wrapper
  wrapperClassName?: string;

  // Values used to reset the page when the change
  resetPagerOn?: Array<string>;

  // Controls dispatch of media fetching
  mediaDispatch: Dispatch<FetchAction<T>>;

  // Handles an infinite scrolling event
  onInfiniteScroll: (page: number) => Promise<Array<T>>;

  // Handles the aftermath of an infinite scroll event
  onInfiniteScrollDone?: () => void;

  // MediaTiles to display
  children: JSX.Element[];
}

export const SmartScroller = <T,>({
  header,
  className,
  wrapperClassName,
  children,
  mediaDispatch,
  resetPagerOn = [],
  onInfiniteScroll,
  onInfiniteScrollDone,
}: SmartScrollProps<T>) => {
  const mediaViewer = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const bottomBoundaryRef = useRef<HTMLDivElement>(null);
  const [pager, pagerDispatch] = useReducer(pageReducer, { page: 0 });

  useScroll(mediaViewer, (_, position) => setScrollPosition(position));
  useInfiniteScroll(bottomBoundaryRef, pagerDispatch);

  // make API calls
  useFetch<T>({
    pager,
    dispatch: mediaDispatch,
    onFetch: () => onInfiniteScroll(pager.page),
    onDone: onInfiniteScrollDone,
  });

  useEffect(() => {
    pagerDispatch({ type: PageAction.Reset });
    mediaDispatch({ type: PageAction.Reset });
  }, resetPagerOn);

  return (
    <div id="media-viewer" ref={mediaViewer}>
      <div className={`${className ?? ""} wide`.trim()}>
        {header && (
          <div className="info">
            <h2>{header}</h2>
          </div>
        )}

        <div className={wrapperClassName ?? "media-tiles"}>
          {children.map((tile) =>
            cloneElement(tile, { parentScrollPosition: scrollPosition }),
          )}
        </div>
        <div id="page-bottom-boundary" ref={bottomBoundaryRef}></div>
      </div>
    </div>
  );
};
