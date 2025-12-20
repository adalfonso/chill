-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "album_artist_id" INTEGER;

-- CreateIndex
CREATE INDEX "Track_album_artist_id_idx" ON "Track"("album_artist_id");

-- Copy artist → album_artist
UPDATE "Track"
SET album_artist_id = artist_id
WHERE artist_id IS NOT NULL;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_album_artist_id_fkey" FOREIGN KEY ("album_artist_id") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
