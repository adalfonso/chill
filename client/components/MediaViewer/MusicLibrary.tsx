import "./MusicLibrary.scss";
import * as React from "react";
import { Media } from "@common/autogen";
import { MediaApi } from "@client/api/MediaApi";
import { MediaMatch as Match } from "@common/MediaType/types";
import { MediaTile, TileData } from "./MediaTile/MediaTile";
import { Select } from "../ui/Select";
import { capitalize } from "@client/util";
import { useEffect, useState } from "react";

const ApiMap: Record<Match, () => Promise<unknown>> = {
  [Match.Artist]: MediaApi.getGroupedByArtist,
  [Match.Album]: MediaApi.getGroupedByAlbum,
  [Match.Genre]: MediaApi.getGroupedByGenre,
};

interface MusicLibraryProps {
  onPlay: (files: Media[]) => Promise<void>;
}

export const MusicLibrary = ({ onPlay }: MusicLibraryProps) => {
  const [match, setMatch] = useState<Match>(Match.Artist);
  const [media_files, setMediaFiles] = useState([]);

  const changeMediaMatch = (value) => {
    setMatch(value);
    loadMediaFiles(value);
  };

  const loadMediaFiles = (match: Match) => {
    ApiMap[match]()
      .then(({ data }) => {
        setMediaFiles(data);
      })
      .catch((_) => {
        console.error(`Failed to load media files with match "${match}"`);
      });
  };

  const displayAs = (file: TileData) => file[match];
  const url = (file: TileData) => `/${match}/${file._id[0]}`;

  const use = async (file: TileData) => {
    const match_value = file[match];
    const results = await MediaApi.query({ [match]: match_value });

    onPlay(results.data);
  };

  useEffect(() => loadMediaFiles(match), []);

  return (
    <>
      <div className="music-library">
        <div className="toolbar">
          <Select
            onChange={changeMediaMatch}
            displayAs={capitalize(match)}
            value={match}
          >
            {Object.values(Match).map((option) => {
              return (
                <option key={option} value={option}>
                  {capitalize(option)}
                </option>
              );
            })}
          </Select>
        </div>
      </div>
      <div id="media-viewer">
        <div className="media-tiles">
          {media_files.map((file) => (
            <MediaTile
              key={file._id}
              file={file}
              displayAs={displayAs}
              url={url}
              use={use}
            />
          ))}
        </div>
      </div>
    </>
  );
};
