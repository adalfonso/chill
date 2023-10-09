import { client } from "@client/client";
import { pagination_limit } from "./constants";

/**
 * Get a bunch of random files and their respective cast info
 *
 * @param is_casting - if the player is casting
 * @returns files and cast info
 */
export const getRandomFiles = async (
  is_casting = false,
  exclusions: string[] = [],
) => {
  const files = await client.media.queryRandom.mutate({
    options: { limit: pagination_limit, $nin: exclusions },
  });

  // Refactor: Here on out is duplicated in MediaTile
  if (!is_casting) {
    return { files, cast_info: null };
  }

  const cast_info = await client.media.castInfo.query({
    media_ids: files.map((file) => file._id),
  });

  return { files, cast_info };
};
