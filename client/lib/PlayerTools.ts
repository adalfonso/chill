import { api } from "@client/client";
import { pagination_limit } from "./constants";

/**
 * Get a bunch of random files and their respective cast info
 *
 * @param is_casting - if the player is casting
 * @returns files and cast info
 */
export const getRandomTracks = async (
  is_casting = false,
  exclusions: Array<number> = [],
) => {
  const tracks = await api.track.getRandomTracks.query({
    limit: pagination_limit,
    exclusions,
  });

  // Refactor: Here on out is duplicated in MediaTile
  if (!is_casting) {
    return { tracks, cast_info: null };
  }

  const cast_info = await api.track.castInfo.query({
    track_ids: tracks.map((file) => file.id),
  });

  return { tracks, cast_info };
};
