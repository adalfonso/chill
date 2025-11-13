/*
  Warnings:

  - Changed the type of `data` on the `AlbumArt` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "AlbumArt" ADD COLUMN "data_bytes" BYTEA;
UPDATE "AlbumArt"
SET "data_bytes" = decode("data", 'base64')
WHERE "data" IS NOT NULL;

ALTER TABLE "AlbumArt" DROP COLUMN "data"; -- drop base64 column
ALTER TABLE "AlbumArt" RENAME COLUMN "data_bytes" TO "data";
ALTER TABLE "AlbumArt" ALTER COLUMN "data" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AlbumArt_checksum_idx" ON "AlbumArt"("checksum");
