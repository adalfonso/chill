import "./MediaViewer.scss";
import * as React from "react";
import { MediaTile, TileData } from "./MediaTile/MediaTile";
import { MediaTypeApi } from "@client/api/MediaTypeApi";
import { MediaTypeFilter as Filter } from "@common/MediaType/types";
import { useState } from "react";

export const MusicLibrary = () => {
  const [filter, setFilter] = useState<Filter>(Filter.Artist);
  const [media_files, setMediaFiles] = useState([]);

  const changeMediaFilter = (e) => {
    const { value } = e.target;
    setFilter(value);
    loadMediaFiles(value);
  };

  const loadMediaFiles = (filter: Filter) => {
    MediaTypeApi.get({ filter })
      .then(({ data }) => {
        setMediaFiles(data);
      })
      .catch((_) => {
        console.error(`Failed to load media files with filter "${filter}"`);
      });
  };

  const displayAs = (file: TileData) => file._id[0];
  const url = (file: TileData) => `/${filter}/${file._id[0]}`;

  React.useEffect(() => loadMediaFiles(filter), []);

  return (
    <>
      <div className="toolbar">
        <select onChange={changeMediaFilter} value={filter}>
          {Object.values(Filter).map((filter_option) => {
            return (
              <option key={filter_option} value={filter_option}>
                {filter_option}
              </option>
            );
          })}
        </select>
      </div>
      <div className="media-tiles">
        {media_files.map((file) => (
          <MediaTile
            key={file._id}
            file={file}
            displayAs={displayAs}
            url={url}
          />
        ))}
      </div>
    </>
  );
};
