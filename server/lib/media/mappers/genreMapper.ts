import { RawMediaPayload } from "../MediaCrawler";
import { db } from "../../data/db";
import { isString, uniq } from "@common/commonUtils";

export const upsertGenres = async (records: Array<RawMediaPayload>) => {
  const genres = uniq(records.map(({ genre }) => genre).filter(isString));

  await db.genre.createMany({
    data: genres.map((genre) => ({ name: genre ?? "Unknown Genre" })),
    skipDuplicates: true,
  });

  const existing_genres = await db.genre.findMany({
    where: { name: { in: genres } },
    select: { id: true, name: true },
  });

  return Object.fromEntries(
    existing_genres.map((genre) => [genre.name, genre.id]),
  );
};
