import { GroupedMedia } from "@common/types";
import { Media } from "@common/models/Media";
import { MediaMatch } from "@common/media/types";

export const artistUrl = (file: GroupedMedia | Media) =>
  `/artist/${encodeURIComponent(file.artist ?? "")}`;

export const albumUrl = (file: GroupedMedia | Media) => {
  const base = `/album/${encodeURIComponent(
    file.album ?? "",
  )}?artist=${encodeURIComponent(file.artist ?? "")}`;

  // Regular media file, not aggregated
  if (typeof file._id === "string") {
    return base;
  }

  return base + (file._id?.album === null ? `&no_album=1` : ``);
};

export const matchUrl = (match: MediaMatch) => (file: GroupedMedia | Media) =>
  `/${match}/${encodeURIComponent(file[match] ?? "")}`;
