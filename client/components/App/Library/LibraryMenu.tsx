import { Link } from "wouter-preact";
import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";

import { LibraryCounts } from "@common/apiTypes";
import { api } from "@client/client";
import { capitalize } from "@common/commonUtils";

export const LibraryMenu = () => {
  const counts = useSignal<LibraryCounts>({
    artists: 0,
    albums: 0,
    compilations: 0,
    splits: 0,
    tracks: 0,
    genres: 0,
  });

  useEffect(() => {
    api.libraryHealth.libraryCounts.query().then((data) => {
      counts.value = data;
    });
  }, []);

  return (
    <div className="library-menu" key="library">
      {Object.entries(counts.value).map(([key, value]) => (
        <MenuItem
          key={key}
          to={`/library/${key}`}
          label={capitalize(key)}
          count={value}
          type={key}
        />
      ))}
    </div>
  );
};

type MenuItemProps = {
  to: string;
  label: string;
  count: number;
  type: string;
};

const MenuItem = ({ to, label, count, type }: MenuItemProps) => (
  <Link href={to} className={`library-menu-item ${type}`}>
    <div className="label">{label}</div>
    <div className="count">{count}</div>
  </Link>
);
