import { cloneElement } from "preact";
import { useState, useRef } from "preact/hooks";

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
  const [scrollPosition, setScrollPosition] = useState(0);
  const observedElement = useRef<HTMLDivElement>(null);

  useScroll(mediaViewer, (_, position) => setScrollPosition(position));

  const { items } = useInfiniteScroll<T>({
    onScroll,
    observedElement,
    options: { root: null, rootMargin: "0px", threshold: 1.0 },
    dependencies,
  });

  return (
    <div id="media-viewer" ref={mediaViewer}>
      <div className={`${className ?? ""} wide`.trim()}>
        {header && (
          <div className="info">
            <h2>{header}</h2>
          </div>
        )}

        <div className={wrapperClassName ?? "media-tiles"}>
          {makeItems(items).map((tile) =>
            cloneElement(tile, { parentScrollPosition: scrollPosition }),
          )}
        </div>
        <div id="page-bottom-boundary" ref={observedElement}></div>
      </div>
    </div>
  );
};
