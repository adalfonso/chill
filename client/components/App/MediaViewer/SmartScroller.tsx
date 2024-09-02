import { cloneElement } from "preact";
import { useRef, useMemo } from "preact/hooks";

import { useScroll, useInfiniteScroll } from "@hooks/index";
import { signal } from "@preact/signals";

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

  const scrollPositionRef = useRef(signal(0));

  useScroll(
    mediaViewer,
    (_, position) => (scrollPositionRef.current.value = position),
  );

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
          parentScrollPosition: scrollPositionRef.current,
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
