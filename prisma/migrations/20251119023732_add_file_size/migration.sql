-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "file_size" INTEGER;
-- Backfill existing tracks
UPDATE "Track" SET "file_size" = 0 WHERE "file_size" IS NULL;
