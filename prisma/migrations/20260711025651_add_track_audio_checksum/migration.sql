-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "audio_checksum" TEXT;

-- CreateIndex
CREATE INDEX "Track_audio_checksum_idx" ON "Track"("audio_checksum");
