import { RawMediaPayload } from "../MediaCrawler";
import { db } from "../../data/db";
import { isString, uniq } from "@common/commonUtils";

export const upsertArtists = async (records: Array<RawMediaPayload>) => {
  const artists = uniq(
    records.map(({ artist }) => artist ?? "Unknown Artist").filter(isString),
  );

  await db.artist.createMany({
    data: artists.map((artist) => ({ name: artist })),
    skipDuplicates: true,
  });

  const existing_artists = await db.artist.findMany({
    where: { name: { in: artists } },
    select: { id: true, name: true },
  });

  return Object.fromEntries(
    existing_artists.map((artist) => [artist.name, artist.id]),
  );
};
