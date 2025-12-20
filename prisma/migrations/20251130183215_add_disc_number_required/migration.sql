/*
  Warnings:

  - Made the column `disc_number` on table `Track` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Track" ALTER COLUMN "disc_number" SET NOT NULL;
