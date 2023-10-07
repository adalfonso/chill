import { useScroll } from "@hooks/useScroll";
import { useState, useRef, cloneElement } from "react";

interface MediaViewerViewerProps {
  header?: string;
  className?: string;
  children: JSX.Element[];
}

export const SmartScroller = ({
  header,
  className,
  children,
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
      </div>
    </div>
  );
};
