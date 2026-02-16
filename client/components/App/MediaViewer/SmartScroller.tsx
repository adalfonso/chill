import type { JSX } from "preact";
import { cloneElement } from "preact";
import { signal } from "@preact/signals";
import { useRef, useMemo, useCallback } from "preact/hooks";

import { useScroll, useInfiniteScroll } from "@hooks/index";

type SmartScrollProps<T> = {
  // Header text
  header?: string;

  // CSS class name for container
  className?: string;

  // CSS class name for tile wrapper
  wrapperClassName?: string;

  // Values used to reset the page when the change
  dependencies?: Array<string>;

  // Handles an infinite scrolling event
  onScroll: (page: number) => Promise<Array<T>>;

  // Function that generates displayable items
  makeItems: (items: Array<T>) => Array<JSX.Element>;
};

export const SmartScroller = <T,>({
  header,
  className,
  wrapperClassName,
  dependencies = [],
  onScroll,
  makeItems,
}: SmartScrollProps<T>) => {
  const mediaViewer = useRef<HTMLDivElement>(null);
  const observedElement = useRef<HTMLDivElement>(null);
  const scroll_position = useRef(signal(0));
  const scroll_throttle_ms = 500;

  // Used to track scroll event so children can cancel menu press
  const onScrollLocal = useCallback(
    (position: number) => (scroll_position.current.value = position),
    [scroll_position.current],
  );

  useScroll(mediaViewer, onScrollLocal, scroll_throttle_ms);

  const { items } = useInfiniteScroll<T>({
    onScroll,
    observedElement,
    options: { root: null, rootMargin: "0px", threshold: 1.0 },
    dependencies,
  });

  const children = useMemo(
    () =>
      makeItems(items).map((tile) =>
        cloneElement(tile, {
          parent_scroll_position: scroll_position.current,
        }),
      ),
    [items],
  );

  return (
    <div id="media-viewer" ref={mediaViewer}>
      <div className={`${className ?? ""} wide`.trim()}>
        {header && (
          <div className="info">
            <h2>{header}</h2>
          </div>
        )}

        <div className={wrapperClassName ?? "media-tiles"}>{children}</div>
        <div id="page-bottom-boundary" ref={observedElement}></div>
      </div>
    </div>
  );
};
