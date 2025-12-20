-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "disc_number" INTEGER;
-- Backfill existing tracks
UPDATE "Track" SET "disc_number" = 1 WHERE "disc_number" IS NULL;