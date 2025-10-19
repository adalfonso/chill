/*
  Warnings:

  - Added the required column `bitrate` to the `Track` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bits_per_sample` to the `Track` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sample_rate` to the `Track` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "bitrate" INTEGER NOT NULL,
ADD COLUMN     "bits_per_sample" INTEGER NOT NULL,
ADD COLUMN     "sample_rate" INTEGER NOT NULL;
