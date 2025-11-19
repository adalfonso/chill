/*
  Warnings:

  - Made the column `file_size` on table `Track` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Track" ALTER COLUMN "file_size" SET NOT NULL;
