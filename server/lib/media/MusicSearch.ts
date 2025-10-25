import { db } from "../data/db";
import { Search } from "../data/Search";

export const rebuildMusicSearchIndex = async () => {
  const start = new Date();

  console.info("Rebuilding music search index...");

  const index_exists = await Search.instance().indices.exists({
    index: "music",
  });

  if (index_exists) {
    await Search.instance().indices.delete({ index: "music" });
  }

  await Search.instance().indices.create({
    index: "music",
    body: {
      mappings: {
        properties: {
          type: { type: "keyword" },
          value: { type: "text" },
          path: { type: "text" },
          displayAs: { type: "keyword" },
        },
      },
    },
  });

  const body = await getFullMusicIndex();

  if (body.length) {
    const response = await Search.instance().bulk({ refresh: true, body });

    console.info(
      `Search engine rebuilt. Took ${
        (new Date().valueOf() - start?.valueOf()) / 1000
      } seconds for ${response.items.length} records`,
    );
  }
};

const music_index = { index: { _index: "music" } };

const getFullMusicIndex = async () => [
  ...(await getArtistIndex()),
  ...(await getAlbumIndex()),
  ...(await getGenreIndex()),
  ...(await getTrackIndex()),
];

const getArtistIndex = async () => {
  const artists = await db.artist.findMany({
    select: { id: true, name: true },
  });

  return artists.flatMap(({ id, name }) => [
    music_index,
    {
      type: "artist",
      value: name,
      path: `/artist/${id}`,
      displayAs: [name, "Artist"],
    },
  ]);
};

const getAlbumIndex = async () => {
  const albums = await db.album.findMany({
    select: {
      id: true,
      title: true,
      artist: { select: { id: true, name: true } },
    },
  });

  return albums.flatMap(({ id, title, artist }) => [
    music_index,
    {
      type: "album",
      value: title,
      path: artist?.id ? `/artist/${artist.id}/album/${id}` : `/album/${id}`,
      displayAs: [title, `Album - ${artist?.name ?? "Unknown Artist"}`],
    },
  ]);
};

const getGenreIndex = async () => {
  const genres = await db.genre.findMany({
    select: { id: true, name: true },
  });

  return genres.flatMap(({ id, name }) => [
    music_index,
    {
      type: "genre",
      value: name,
      path: `/genre/${id}`,
      displayAs: [name, `Genre`],
    },
  ]);
};

const getTrackIndex = async () => {
  const tracks = await db.track.findMany({
    select: {
      title: true,
      artist: { select: { id: true, name: true } },
      album: { select: { id: true, title: true } },
    },
  });

  return tracks.flatMap(({ title, artist, album }) => [
    music_index,
    {
      type: "track",
      value: title,
      path:
        album?.id && artist?.id
          ? `/artist/${artist.id}/album/${album.id}`
          : album?.id
            ? `/album/${album.id}`
            : "",
      displayAs: [title, `Track - ${artist?.name ?? "Unknown Artist"}`],
    },
  ]);
};
