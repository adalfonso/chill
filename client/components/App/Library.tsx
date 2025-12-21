import { ComponentChildren } from "preact";
import { useRef } from "preact/compat";
import { effect, useSignal } from "@preact/signals";

import "./Library.scss";
import { AlbumView } from "./MediaViewer/AlbumView";
import { ArtistView } from "./MediaViewer/ArtistView";
import { GenreView } from "./MediaViewer/GenreView";
import { LibraryMenu } from "./Library/LibraryMenu";
import { MediaTileFetcher } from "./MediaViewer/MediaTileFetcher";
import { PlayRandom } from "./Library/PlayRandom";
import { screen_breakpoint_px } from "@client/lib/constants";
import { useAppState } from "@hooks/useAppState";
import { useViewport } from "@hooks/useViewport";

type StackItem = { key: string; value: ComponentChildren };
type Stack = Array<StackItem>;

export const Library = () => {
  const { view_path } = useAppState();
  const prev_view_path = useRef("");
  const stack = useSignal<Stack>([{ key: "/library", value: <LibraryMenu /> }]);
  const { width } = useViewport();

  const is_mobile = width < screen_breakpoint_px;

  effect(() => {
    const prev = prev_view_path.current;
    const current = view_path.value;

    if (prev !== current) {
      const stackIndex = stack.value.findIndex(({ key }) => key === current);

      // Back navigation → pop
      if (stackIndex > -1) {
        stack.value = stack.value.slice(0, stackIndex + 1);
      }

      // Forward navigation → push
      if (
        /^\/library/.test(current) &&
        !stack.value.some(({ key }) => key === current)
      ) {
        const item = getLibraryStack(current);

        if (item) {
          stack.value = [...stack.value, { key: current, value: item }];
        }
      }
    }

    // Update prev LAST
    prev_view_path.current = current;
  });

  return (
    <div id="library" className={is_mobile ? "mobile" : ""}>
      {/* Current stack view */}
      {stack.value.map(({ value }) => value)}
    </div>
  );
};

type Route = {
  pattern: RegExp;
  render: (match: RegExpMatchArray) => JSX.Element;
};

const routes: Route[] = [
  {
    pattern: /^\/library\/artists$/,
    render: () => <MediaTileFetcher type="artist" key="artist-list" />,
  },
  {
    pattern: /^\/library\/artist\/(\d+)$/,
    render: (m) => <ArtistView artist_id={+m[1]} />,
  },
  {
    pattern: /^\/library\/artist\/(\d+)\/album\/(\d+)$/,
    render: (m) => <AlbumView album_id={+m[2]} />,
  },
  {
    pattern: /^\/library\/albums$/,
    render: () => <MediaTileFetcher type="album" key="album-list" />,
  },
  {
    pattern: /^\/library\/album\/(\d+)$/,
    render: (m) => <AlbumView album_id={+m[1]} />,
  },
  {
    pattern: /^\/library\/compilations$/,
    render: () => (
      <MediaTileFetcher type="compilation" key="compilation-list" />
    ),
  },
  {
    pattern: /^\/library\/splits$/,
    render: () => <MediaTileFetcher type="split" key="split-list" />,
  },
  {
    pattern: /^\/library\/tracks$/,
    render: () => (
      <div className="tracks-view">
        <PlayRandom />
        <MediaTileFetcher type="track" key="track-list" />
      </div>
    ),
  },
  {
    pattern: /^\/library\/genres$/,
    render: () => <MediaTileFetcher type="genre" key="genre-list" />,
  },
  {
    pattern: /^\/library\/genre\/(\d+)$/,
    render: (m) => <GenreView genre_id={+m[1]} />,
  },
];

export const getLibraryStack = (path: string) => {
  for (const { pattern, render } of routes) {
    const match = path.match(pattern);

    if (match) return render(match);
  }
};
