/*
  Warnings:

  - A unique constraint covering the columns `[title,year,artist_id]` on the table `Album` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Album_title_year_key";

-- CreateIndex
CREATE UNIQUE INDEX "Album_title_year_artist_id_key" ON "Album"("title", "year", "artist_id");
