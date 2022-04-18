import "./MediaViewer.scss";
import * as React from "react";
import { MediaTypeApi } from "@client/api/MediaTypeApi";
import { MediaTypeFilter as Filter } from "@common/MediaType/types";

export const MediaViewer = () => {
  const [filter, setFilter] = React.useState<Filter>(Filter.Artist);
  const [media_files, setMediaFiles] = React.useState([]);

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

  React.useEffect(() => loadMediaFiles(filter), []);

  return (
    <div id="media-viewer">
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
        {media_files.map((file) => {
          return (
            <div className="media-tile" key={file._id}>
              <div>{file._id}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
