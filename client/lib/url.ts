import { Media } from "@common/models/Media";
import { MediaMatch } from "@common/media/types";
import { TileData } from "./types";
import { ObjectID } from "bson";

export const artistUrl = (file: TileData | Media) =>
  `/artist/${encodeURIComponent(file.artist ?? "")}`;

export const albumUrl = (file: TileData | Media) => {
  const base = `/album/${encodeURIComponent(
    file.album ?? "",
  )}?artist=${encodeURIComponent(file.artist ?? "")}`;

  // Regular media file, not aggregated
  if (file._id instanceof ObjectID) {
    return base;
  }

  return base + (file._id?.album === null ? `&no_album=1` : ``);
};

export const matchUrl = (match: MediaMatch) => (file: TileData | Media) =>
  `/${match}/${encodeURIComponent(file[match] ?? "")}`;
