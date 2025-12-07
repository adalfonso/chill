import { MediaTileType } from "@common/types";

export const albumUrl = (artist_id?: number) => (album_id: number) => {
  return (
    `/library/album/${album_id}` + (artist_id ? `?artist=${artist_id}` : ``)
  );
};

export const artistAlbumUrl = (artist_id: number, album_id: number) =>
  `/library/artist/${artist_id}/album/${album_id}`;

export const matchUrl = (match: MediaTileType) => (match_id: number) => {
  const direct_maches = new Set<MediaTileType>([
    MediaTileType.Album,
    MediaTileType.Artist,
    MediaTileType.Genre,
  ]);

  if (direct_maches.has(match)) {
    return `/library/${match}/${match_id}`;
  }

  if (match === MediaTileType.Compilation || match === MediaTileType.Split) {
    return `/library/album/${match_id}`;
  }

  // // Don't link anywhere for tracks
  return "";
};

export const artistUrl = matchUrl(MediaTileType.Artist);
