import { MediaTileData, MediaTileType, PlayMode } from "@common/types";
import { api } from "@client/client";
import {
  getTrackIds,
  getTracks as loadTracks,
  sort_clauses,
} from "@client/lib/TrackLoaders";

/**
 * Maps a tile type and its data to the appropriate track filter and sort clause.
 *
 * @param tile_type - The type of media tile (Artist, Album, Genre, etc.)
 * @param tile - The tile data containing the entity ID
 * @returns The filter and sort clause for querying tracks
 */
const filterForTileType = <T extends Record<string, unknown>>(
  tile_type: MediaTileType,
  tile: MediaTileData<T>,
) => {
  switch (tile_type) {
    case MediaTileType.Artist:
      return { filter: { artist_id: tile.id }, sort: sort_clauses.artist };

    case MediaTileType.Album:
    case MediaTileType.Compilation:
    case MediaTileType.Split:
      return { filter: { album_id: tile.id }, sort: sort_clauses.album };

    case MediaTileType.Genre:
      return { filter: { genre_id: tile.id }, sort: sort_clauses.genre };

    case MediaTileType.Track:
      return { filter: {}, sort: sort_clauses.track };
  }
};

/**
 * Fetches full track objects for a media tile.
 *
 * @param tile_type - The type of media tile (Artist, Album, Genre, etc.)
 * @param tile - The tile data containing the entity ID
 * @param limit - Maximum number of tracks to return
 * @param offset - Number of tracks to skip
 * @returns The matching tracks
 */
export const fetchTracks = async <T extends Record<string, unknown>>(
  tile_type: MediaTileType,
  tile: MediaTileData<T>,
  limit?: number,
  offset?: number,
) => {
  const { filter, sort } = filterForTileType(tile_type, tile);
  return loadTracks(filter, { limit, offset, sort });
};

/**
 * Fetches only track IDs for a media tile. Used for playlist operations
 * where full track data is not needed.
 *
 * @param tile_type - The type of media tile (Artist, Album, Genre, etc.)
 * @param tile - The tile data containing the entity ID
 * @param limit - Maximum number of track IDs to return
 * @returns The matching track IDs
 */
export const fetchTrackIds = async <T extends Record<string, unknown>>(
  tile_type: MediaTileType,
  tile: MediaTileData<T>,
  limit?: number,
) => {
  const { filter, sort } = filterForTileType(tile_type, tile);
  return getTrackIds(filter, { limit, sort });
};

/**
 * Fetches tracks for a media tile and, when casting is active,
 * additionally fetches Chromecast metadata for those tracks.
 *
 * @param tile_type - The type of media tile (Artist, Album, Genre, etc.)
 * @param tile - The tile data containing the entity ID
 * @param limit - Maximum number of tracks to return
 * @param offset - Number of tracks to skip
 * @param is_casting - Whether to also fetch Chromecast metadata
 * @returns The tracks and optionally cast info
 */
export const fetchTracksWithCastInfo =
  <T extends Record<string, unknown>>(
    tile_type: MediaTileType,
    tile: MediaTileData<T>,
    limit?: number,
    offset?: number,
  ) =>
  async (is_casting = false) => {
    const tracks = await fetchTracks(tile_type, tile, limit, offset);

    if (!is_casting) {
      return { tracks, cast_info: null };
    }

    const cast_info = await api.track.castInfo.query({
      track_ids: tracks.map((file) => file.id),
    });

    return { tracks, cast_info };
  };

/**
 * Resolves the play mode for a given tile type. Normalizes Compilation
 * and Split types to Album since they share the same playback behavior.
 *
 * @param type - The media tile type to resolve
 * @returns The normalized play mode
 */
export const playModeForTileType = (type: MediaTileType): PlayMode => {
  switch (type) {
    case MediaTileType.Artist:
      return MediaTileType.Artist;
    case MediaTileType.Album:
    case MediaTileType.Compilation:
    case MediaTileType.Split:
      return MediaTileType.Album;
    case MediaTileType.Genre:
      return MediaTileType.Genre;
    case MediaTileType.Track:
      return MediaTileType.Track;
  }
};
