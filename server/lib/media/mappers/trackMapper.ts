import { RawMediaPayload } from "../MediaCrawler";
import { db } from "../../data/db";

export const insertTracks = async (
  records: Array<RawMediaPayload>,
  maps: {
    genre: Record<string, number>;
    album: Record<string, number>;
    artist: Record<string, number>;
  },
) => {
  const tracks = records.map((record) => {
    const album_key = JSON.stringify({
      title: record.album,
      year: record.year,
    });

    return {
      path: record.path,
      duration: record.duration,
      number: record.track,
      file_type: record.file_type,
      title: record.title ?? "",
      bitrate: record.bitrate,
      sample_rate: record.sample_rate,
      bits_per_sample: record.bits_per_sample,
      genre_id: record.genre === null ? null : maps.genre[record.genre],
      artist_id: record.artist === null ? null : maps.artist[record.artist],
      album_id: record.album === null ? null : maps.album[album_key],
      file_modified: record.file_modified,
    };
  });

  await db.track.createMany({ data: tracks });
};
