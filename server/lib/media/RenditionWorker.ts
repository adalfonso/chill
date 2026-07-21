import { RenditionTier, RenditionJobStatus } from "@prisma/client";

import { db } from "@server/lib/data/db";
import { renditionTierTargetKbps } from "@server/lib/media/renditionTiers";
import { convert as convertAudioTrack } from "@server/lib/conversion";
import { moveRenditionIntoCache } from "@server/lib/media/RenditionCache";

const CONCURRENCY = 4;
const POLL_INTERVAL_MS = 3000;

/**
 * Reset jobs stuck in `running` back to `pending`
 *
 * v1 restart-safety: a process crash/restart mid-job leaves no heartbeat, so
 * any `running` row found at boot is assumed orphaned by the previous process
 * and requeued. Safe because only one process drains this queue.
 */
const resetStaleRunningJobs = async () => {
  const result = await db.renditionJob.updateMany({
    where: { status: RenditionJobStatus.Running },
    data: { status: RenditionJobStatus.Pending, started_at: null },
  });

  if (result.count > 0) {
    console.info(
      `Rendition worker: requeued ${result.count} stale running job(s) from a previous run`,
    );
  }
};

const runJob = async (job: {
  id: number;
  audio_checksum: string;
  tier: RenditionTier;
}) => {
  const track = await db.track.findFirst({
    where: { audio_checksum: job.audio_checksum },
  });

  if (!track) {
    await db.renditionJob.update({
      where: { id: job.id },
      data: {
        status: RenditionJobStatus.Failed,
        finished_at: new Date(),
        error: "No track found for audio_checksum",
      },
    });
    return;
  }

  const start = new Date();

  try {
    const target_kbps = renditionTierTargetKbps(job.tier);
    const tmp_file = await convertAudioTrack(target_kbps, track);
    const rendition = await moveRenditionIntoCache(
      job.audio_checksum,
      job.tier,
      tmp_file,
      target_kbps,
    );

    await db.renditionJob.update({
      where: { id: job.id },
      data: {
        status: RenditionJobStatus.Done,
        finished_at: new Date(),
        source_codec: track.file_type,
        source_bitrate: track.bitrate,
        in_bytes: track.file_size,
        out_bytes: rendition.size,
      },
    });

    console.info(
      `Rendition worker: job=${job.id} track=${track.id} tier=${job.tier} done in ${new Date().valueOf() - start.valueOf()}ms (${track.file_size} -> ${rendition.size} bytes)`,
    );
  } catch (error) {
    console.error(
      `Rendition worker: job=${job.id} track=${track.id} tier=${job.tier} failed`,
      error,
    );

    await db.renditionJob.update({
      where: { id: job.id },
      data: {
        status: RenditionJobStatus.Failed,
        finished_at: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
};

const drainOnce = async () => {
  const claimable = await db.renditionJob.findMany({
    where: { status: RenditionJobStatus.Pending },
    orderBy: [{ priority: "desc" }, { enqueued_at: "asc" }],
    take: CONCURRENCY,
  });

  if (claimable.length === 0) {
    return;
  }

  const claimed_ids = claimable.map((job) => job.id);

  // Guard the claim on status still being Pending — a defensive check
  // against a job's status changing between the findMany above and this
  // update (only meaningful if this ever runs as more than one process;
  // today's single-process/single-interval design makes it unreachable in
  // practice, but it's cheap insurance against that assumption changing).
  await db.renditionJob.updateMany({
    where: { id: { in: claimed_ids }, status: RenditionJobStatus.Pending },
    data: { status: RenditionJobStatus.Running, started_at: new Date() },
  });

  console.info(
    `Rendition worker: claimed ${claimable.length} job(s): ${claimed_ids.join(", ")}`,
  );

  await Promise.all(claimable.map(runJob));
};

/**
 * Start the background rendition drain loop
 *
 * Polls for pending RenditionJob rows and transcodes up to CONCURRENCY of
 * them at a time. Deliberately modest concurrency relative to the crawler's
 * worker pool — this is CPU-bound (ffmpeg) where the crawler is I/O-bound,
 * so a flat cap avoids starving crawl throughput without needing explicit
 * coordination between the two.
 */
export const startRenditionWorker = () => {
  console.info(
    `Rendition worker: starting (concurrency=${CONCURRENCY}, poll_interval_ms=${POLL_INTERVAL_MS})`,
  );

  resetStaleRunningJobs().catch((error) =>
    console.error("Failed to reset stale rendition jobs", error),
  );

  let draining = false;

  setInterval(() => {
    if (draining) {
      return;
    }

    draining = true;

    drainOnce()
      .catch((error) => console.error("Rendition worker drain failed", error))
      .finally(() => {
        draining = false;
      });
  }, POLL_INTERVAL_MS);
};
