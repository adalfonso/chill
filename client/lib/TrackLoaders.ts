import { DEFAULT_LIMIT, DEFAULT_PAGE, paginate } from "@common/pagination";
import { api } from "@client/client";
import { PlayMode } from "@reducers/player.types";
import { PlayerState } from "@reducers/player";
import { SortClause } from "@common/schema";
import { SortOrder } from "@common/types";

/**
 * Get more tracks for the various player modes
 *
 * @param player - player state
 * @returns tracks
 */
export const getMoreTracks = (player: PlayerState) => {
  switch (player.play_options.mode) {
    case PlayMode.Random: {
      return getRandomTracks({
        exclusions: player.playlist.map((file) => file.id),
      });
    }

    case PlayMode.UserPlaylist: {
      const { id, limit, page } = player.play_options;
      return getPlaylistTracks({ playlist_id: id }, { limit, page: page + 1 });
    }

    case PlayMode.Artist: {
      const { id, limit, page } = player.play_options;
      return getTracks(
        { artist_id: id },
        { limit, page: page + 1, sort: sort_clauses.artist },
      );
    }

    case PlayMode.Album: {
      const { id, limit, page } = player.play_options;
      return getTracks(
        { album_id: id },
        { limit, page: page + 1, sort: sort_clauses.album },
      );
    }

    case PlayMode.Genre: {
      const { id, limit, page } = player.play_options;
      return getTracks(
        { genre_id: id },
        { limit, page: page + 1, sort: sort_clauses.genre },
      );
    }

    case PlayMode.None: {
      return Promise.resolve([]);
    }
  }
};

/**
 * Get a bunch of random files
 *
 * @param is_casting - if the player is casting
 * @returns files and cast info
 */
export const getRandomTracks = (
  options: {
    exclusions?: Array<number>;
    limit?: number;
  } = {},
) => {
  const { exclusions = [], limit = DEFAULT_LIMIT } = options;

  return api.track.getRandomTracks.query({
    limit,
    exclusions,
  });
};

/**
 * Get tracks within a user-created playlist
 *
 * @param filter.playlist_id - playlist ID
 * @param options.page - pagination page
 * @param options.limit - pagination limit
 * @returns tracks
 */
export const getPlaylistTracks = (
  filter: { playlist_id: number },
  options: {
    page?: number;
    limit?: number;
  } = {},
) => {
  const { playlist_id } = filter;
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = options;

  return api.playlist.tracks.query({
    id: playlist_id,
    options: paginate({ page, limit }),
  });
};

/**
 * General purpose function to get tracks
 *
 * Can filter by artist, album, and/o genre
 *
 * @param filter.artist_id - artist's ID
 * @param filter.album_id - album's ID
 * @param filter.genre_id - genre's ID
 * @param options.page - pagination page
 * @param options.limit - pagination limit
 * @returns tracks
 */
export const getTracks = (
  filter: { artist_id?: number; album_id?: number; genre_id?: number } = {},
  options: { page?: number; limit?: number; sort?: Array<SortClause> } = {},
) => {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, sort = [] } = options;

  return api.track.get.query({
    ...filter,
    options: paginate({ page, limit, sort }),
  });
};

export const sort_clauses: Record<string, Array<SortClause>> = {
  album: [{ album_id: SortOrder.asc }],
  artist: [{ album_id: SortOrder.asc }, { number: SortOrder.asc }],
  genre: [
    { artist_id: SortOrder.asc },
    { album_id: SortOrder.asc },
    { number: SortOrder.asc },
  ],
};

/**
 * General purpose function to get tracks
 *
 * Can filter by artist, album, and/o genre
 *
 * @param filter.artist_id - artist's ID
 * @param filter.album_id - album's ID
 * @param filter.genre_id - genre's ID
 * @param options.page - pagination page
 * @param options.limit - pagination limit
 * @returns tracks
 */
export const getTrackIds = (
  filter: { artist_id?: number; album_id?: number; genre_id?: number } = {},
  options: { page?: number; limit?: number; sort?: Array<SortClause> } = {},
) => {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, sort = [] } = options;

  return api.track.getIds.query({
    ...filter,
    options: paginate({ page, limit, sort }),
  });
};
