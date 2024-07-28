import { MediaTileType } from "@common/types";

export const albumUrl = (artist_id?: number) => (album_id: number) => {
  return `/album/${album_id}` + (artist_id ? `?artist=${artist_id}` : ``);
};

export const artistAlbumUrl = (artist_id: number, album_id: number) =>
  `/artist/${artist_id}/album/${album_id}`;

export const matchUrl = (match: MediaTileType) => (match_id: number) =>
  `/${match}/${match_id}`;

export const artistUrl = matchUrl(MediaTileType.Artist);
