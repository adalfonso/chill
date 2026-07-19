-- CreateEnum
CREATE TYPE "RenditionTier" AS ENUM ('High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "RenditionJobStatus" AS ENUM ('Pending', 'Running', 'Done', 'Failed');

-- CreateTable
CREATE TABLE "Rendition" (
    "id" SERIAL NOT NULL,
    "audio_checksum" TEXT NOT NULL,
    "tier" "RenditionTier" NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rendition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenditionJob" (
    "id" SERIAL NOT NULL,
    "audio_checksum" TEXT NOT NULL,
    "tier" "RenditionTier" NOT NULL,
    "status" "RenditionJobStatus" NOT NULL DEFAULT 'Pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enqueued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "error" TEXT,
    "source_codec" TEXT,
    "source_bitrate" INTEGER,
    "in_bytes" INTEGER,
    "out_bytes" INTEGER,

    CONSTRAINT "RenditionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rendition_audio_checksum_idx" ON "Rendition"("audio_checksum");

-- CreateIndex
CREATE UNIQUE INDEX "Rendition_audio_checksum_tier_key" ON "Rendition"("audio_checksum", "tier");

-- CreateIndex
CREATE INDEX "RenditionJob_status_priority_enqueued_at_idx" ON "RenditionJob"("status", "priority", "enqueued_at");

-- CreateIndex
CREATE UNIQUE INDEX "RenditionJob_audio_checksum_tier_key" ON "RenditionJob"("audio_checksum", "tier");
