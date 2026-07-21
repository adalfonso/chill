import fs from "node:fs/promises";

import { RenditionTier, RenditionJobStatus } from "@prisma/client";

import { db } from "@server/lib/data/db";
import { resolveTier } from "@server/lib/media/resolveTier";
import { renditionTierToQuality } from "@server/lib/media/renditionTiers";
import { renditionPath } from "@server/lib/media/RenditionCache";

/**
 * Enqueue a rendition job if one isn't already covered
 *
 * A job is skipped if a rendition already exists for this (checksum, tier)
 * *and its file is still on disk* — per ADR-0006 the cache directory is a
 * disposable, wipeable cache, so a surviving DB row with no backing file
 * must still be rebuilt. A job is also skipped if a pending/running job
 * already covers it — running/done/failed jobs are left alone so this never
 * clobbers in-progress or finished work.
 *
 * @param checksum - source track's audio checksum
 * @param tier - rendition quality tier
 * @param priority - queue priority, higher drains first
 */
export const enqueueRendition = async (
  checksum: string,
  tier: RenditionTier,
  priority = 0,
) => {
  const existing_rendition = await db.rendition.findUnique({
    where: { audio_checksum_tier: { audio_checksum: checksum, tier } },
  });

  if (existing_rendition) {
    const exists_on_disk = await fs
      .stat(renditionPath(checksum, tier))
      .then(() => true)
      .catch(() => false);

    if (exists_on_disk) {
      return;
    }
  }

  const existing_job = await db.renditionJob.findUnique({
    where: { audio_checksum_tier: { audio_checksum: checksum, tier } },
  });

  if (!existing_job) {
    await db.renditionJob.create({
      data: { audio_checksum: checksum, tier, priority },
    });
    return;
  }

  if (
    existing_job.status === RenditionJobStatus.Pending &&
    priority > existing_job.priority
  ) {
    await db.renditionJob.update({
      where: { id: existing_job.id },
      data: { priority },
    });
  }
};

/**
 * Mark a rendition's job Done, recording completion telemetry
 *
 * Called when a rendition is produced synchronously (a live cache-miss
 * transcode in `load`) rather than by the background worker. Upserts on
 * (checksum, tier): flips an existing eager job to Done, or creates a Done
 * row when none was ever enqueued — e.g. lazily-built high/low tiers, which
 * are never eagerly queued. Keeps every produced rendition represented in
 * queue telemetry regardless of who built it.
 *
 * @param checksum - source track's audio checksum
 * @param tier - rendition quality tier
 * @param telemetry - encode timing and byte counts for the job record
 */
export const markRenditionJobDone = async (
  checksum: string,
  tier: RenditionTier,
  telemetry: {
    started_at: Date;
    source_codec: string;
    source_bitrate: number;
    in_bytes: number;
    out_bytes: number;
  },
) => {
  const existing_job = await db.renditionJob.findUnique({
    where: { audio_checksum_tier: { audio_checksum: checksum, tier } },
  });

  // The worker already claimed this job and is transcoding it independently
  // — don't stomp its claim. The Rendition row this call's caller just wrote
  // already reflects a usable result regardless of which producer wins.
  if (existing_job?.status === RenditionJobStatus.Running) {
    return;
  }

  const completed = {
    status: RenditionJobStatus.Done,
    finished_at: new Date(),
    error: null,
    ...telemetry,
  };

  await db.renditionJob.upsert({
    where: { audio_checksum_tier: { audio_checksum: checksum, tier } },
    create: { audio_checksum: checksum, tier, ...completed },
    update: completed,
  });
};

/**
 * Enqueue eager `medium` rendition jobs for every no-tandem-eligible track
 *
 * Called after a fully completed scan. v1 only ships `medium` eagerly per
 * ADR-0003 — `high`/`low` are generated lazily via cache-miss fallback only.
 */
export const enqueueEligibleRenditions = async () => {
  const tier = RenditionTier.Medium;

  console.info(`Enqueuing eligible ${tier} renditions...`);

  const tracks = await db.track.findMany({
    where: { audio_checksum: { not: null } },
    select: {
      audio_checksum: true,
      file_type: true,
      file_size: true,
      duration: true,
    },
  });

  let eligible = 0;

  for (const track of tracks) {
    if (!track.audio_checksum) {
      continue;
    }

    const resolution = resolveTier(renditionTierToQuality(tier), {
      file_type: track.file_type,
      effective_kbps: (track.file_size * 8) / 1000 / track.duration.toNumber(),
    });

    if (resolution.convert) {
      eligible++;
      await enqueueRendition(track.audio_checksum, tier);
    }
  }

  console.info(
    `Rendition queue: ${eligible} of ${tracks.length} tracks eligible for ${tier} (enqueued if not already cached/queued)`,
  );
};
