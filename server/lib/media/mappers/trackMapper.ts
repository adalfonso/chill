import { RawMediaPayload } from "../MediaCrawler";
import { db } from "../../data/db";
import { getAlbumLookupKey } from "./albumMapper";

export const insertTracks = async (
  records: Array<RawMediaPayload>,
  maps: {
    album: Record<string, number>;
    artist: Record<string, number>;
    genre: Record<string, number>;
  },
) => {
  const tracks = records.map((record) => {
    const album_key = getAlbumLookupKey({
      artist_id: record.artist === null ? null : maps.artist[record.artist],
      title: record.album,
      year: record.year,
    });

    return {
      album_id: maps.album[album_key] ?? null,
      artist_id: record.artist === null ? null : maps.artist[record.artist],
      bitrate: record.bitrate,
      bits_per_sample: record.bits_per_sample,
      duration: record.duration,
      file_modified: record.file_modified,
      file_size: record.file_size,
      file_type: record.file_type,
      genre_id: record.genre === null ? null : maps.genre[record.genre],
      number: record.track,
      disc_number: record.disc_number,
      path: record.path,
      sample_rate: record.sample_rate,
      title: record.title ?? "",
    };
  });

  await db.track.createMany({ data: tracks });
};
