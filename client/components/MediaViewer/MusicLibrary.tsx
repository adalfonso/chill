import "./MediaViewer.scss";
import * as React from "react";
import { MediaApi } from "@client/api/MediaApi";
import { MediaTile, TileData } from "./MediaTile/MediaTile";
import { MediaTypeFilter as Filter } from "@common/MediaType/types";
import { useState } from "react";

const ApiMap: Record<Filter, () => Promise<unknown>> = {
  [Filter.Artist]: MediaApi.getGroupedByArtist,
  [Filter.Album]: MediaApi.getGroupedByAlbum,
  [Filter.Genre]: MediaApi.getGroupedByGenre,
};

export const MusicLibrary = () => {
  const [filter, setFilter] = useState<Filter>(Filter.Artist);
  const [media_files, setMediaFiles] = useState([]);

  const changeMediaFilter = (e) => {
    const { value } = e.target;
    setFilter(value);
    loadMediaFiles(value);
  };

  const loadMediaFiles = (filter: Filter) => {
    ApiMap[filter]()
      .then(({ data }) => {
        setMediaFiles(data);
      })
      .catch((_) => {
        console.error(`Failed to load media files with filter "${filter}"`);
      });
  };

  const displayAs = (file: TileData) => file[filter];
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
