import { useScroll } from "@hooks/useScroll";
import { useState, useRef, cloneElement, RefObject } from "react";

interface MediaViewerViewerProps {
  // Header text
  header?: string;

  // CSS class name for container
  className?: string;

  // MediaTiles
  children: JSX.Element[];

  // Boundary for triggering infinite scroll
  boundary?: RefObject<HTMLDivElement>;
}

export const SmartScroller = ({
  header,
  className,
  children,
  boundary,
}: MediaViewerViewerProps) => {
  const mediaViewer = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  useScroll(mediaViewer, (_, position) => setScrollPosition(position));

  return (
    <div id="media-viewer" ref={mediaViewer}>
      <div className={`${className ?? ""} wide`.trim()}>
        {header && (
          <div className="info">
            <h2>{header}</h2>
          </div>
        )}

        <div className="media-tiles">
          {children.map((tile) =>
            cloneElement(tile, { parentScrollPosition: scrollPosition }),
          )}
        </div>
        {boundary && <div id="page-bottom-boundary" ref={boundary}></div>}
      </div>
    </div>
  );
};
