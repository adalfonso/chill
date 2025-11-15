import { AlbumCover, RawMediaPayload } from "../MediaCrawler";
import { Maybe } from "@common/types";
import { db } from "../../data/db";

export const UNKNOWN_ALBUM_TITLE = "Unknown Album";

type AlbumUpsertInput = {
  title: string;
  year: number;
  artist_id: Array<number>;
  cover: Maybe<AlbumCover>;
};

export const getAlbumLookupKey = (album: {
  artist_id: Maybe<number>;
  title: Maybe<string>;
  year: Maybe<number>;
}) => {
  return JSON.stringify({
    artist_id: album.artist_id,
    title: album.title ?? UNKNOWN_ALBUM_TITLE,
    year: album.year ?? 0,
  });
};

export const upsertAlbums = async (
  records: Array<RawMediaPayload>,
  artist_map: Record<string, number>,
) => {
  // n.b. this classifies album by album title and year, but not artist. It may
  // be better to include artist eventually
  const recordsGroupedByAlbum = toGroupedAlbumInput(records, artist_map);

  const albums = Object.values(recordsGroupedByAlbum).map(
    ({ title, year, artist_id }) => {
      const set = new Set(artist_id);

      return {
        title,
        year,
        artist_id: set.size === 1 ? ([...set].at(0) ?? null) : null,
      };
    },
  );

  await db.album.createMany({
    data: albums,
    skipDuplicates: true,
  });

  const existing_albums = await db.album.findMany({
    where: { OR: albums },
    select: {
      id: true,
      artist_id: true,
      title: true,
      year: true,
      album_art: true,
    },
  });

  // Detect album art that has not yet been inserted
  const album_art_to_add = existing_albums
    .filter((album) => {
      const cover = recordsGroupedByAlbum[getAlbumLookupKey(album)].cover;

      return (
        cover &&
        (!album.album_art || album.album_art.checksum !== cover.checksum)
      );
    })
    .map((album) => {
      const cover = recordsGroupedByAlbum[getAlbumLookupKey(album)]
        .cover as AlbumCover;

      return {
        ...cover,
        filename: `${album.id}.${cover.format.replace("image/", "")}`,
        album_id: album.id,
      };
    });

  if (album_art_to_add.length) {
    const albumIds = album_art_to_add.map((a) => a.album_id);

    await db.albumArt.deleteMany({
      where: { album_id: { in: albumIds } },
    });

    await db.albumArt.createMany({
      data: album_art_to_add,
      skipDuplicates: true,
    });
  }

  return Object.fromEntries(
    existing_albums.map((album) => [getAlbumLookupKey(album), album.id]),
  );
};

const toGroupedAlbumInput = (
  records: Array<RawMediaPayload>,
  artist_map: Record<string, number>,
) =>
  records
    .map(({ album, year, artist, cover }) => ({
      title: album ?? UNKNOWN_ALBUM_TITLE,
      year: year ?? 0,
      artist_id: artist ? (artist_map[artist] ?? null) : null,
      cover,
    }))
    .reduce<Record<string, AlbumUpsertInput>>((carry, album) => {
      const key = getAlbumLookupKey(album);

      const { title, year, artist_id, cover } = album;

      if (!carry[key]) {
        carry[key] = { title, year, artist_id: [], cover: null };
      }

      if (artist_id) {
        carry[key].artist_id.push(artist_id);
      }

      if (cover && !carry[key].cover) {
        carry[key].cover = cover;
      }

      return carry;
    }, {});
