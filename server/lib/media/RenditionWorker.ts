import os from "node:os";

import { RenditionTier, RenditionJobStatus } from "@prisma/client";

import { db } from "@server/lib/data/db";
import { renditionTierTargetKbps } from "@server/lib/media/renditionTiers";
import { convert as convertAudioTrack } from "@server/lib/conversion";
import { moveRenditionIntoCache } from "@server/lib/media/RenditionCache";

const MAX_CONCURRENCY = Math.max(1, os.cpus().length - 1);
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

/**
 * Transcode and cache a single claimed rendition job
 *
 * Looks up the job's source track by checksum (the job itself only stores
 * `audio_checksum` + `tier`, not a track FK — see deleteOrphans.ts). Marks
 * the job Failed immediately if no matching track exists (e.g. the track
 * was removed since the job was enqueued); otherwise transcodes, moves the
 * result into the rendition cache, and marks the job Done with encode
 * telemetry, or Failed with the error message if any step throws.
 *
 * @param job - the claimed job's id, source checksum, and target tier
 */
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

/**
 * Atomically claim the single highest-priority, oldest-enqueued Pending job
 *
 * Uses `updateMany` filtered on `status: Pending` as the atomic compare-and-set:
 * concurrent slots racing this at the same moment can each only flip a row
 * that's still Pending, so two slots can never claim the same job. The
 * candidate row is picked first via `findFirst` (cheap, no lock held across
 * it), then the update re-checks its id + Pending status. With many slots
 * racing this against the same "oldest pending" row (e.g. all `MAX_CONCURRENCY`
 * slots starting together on a fresh `tick`), only one wins per candidate —
 * the rest come back `"contended"` and must retry against a new candidate
 * rather than give up, or the pool collapses to however many won their
 * *first* race instead of settling at full concurrency.
 *
 * @returns the claimed job, `"contended"` if another slot won the race (retry),
 *   or `"empty"` if there is truly nothing Pending
 */
const claimNextJob = async (): Promise<
  | { id: number; audio_checksum: string; tier: RenditionTier }
  | "contended"
  | "empty"
> => {
  const candidate = await db.renditionJob.findFirst({
    where: { status: RenditionJobStatus.Pending },
    orderBy: [{ priority: "desc" }, { enqueued_at: "asc" }],
  });

  if (!candidate) {
    return "empty";
  }

  const { count } = await db.renditionJob.updateMany({
    where: { id: candidate.id, status: RenditionJobStatus.Pending },
    data: { status: RenditionJobStatus.Running, started_at: new Date() },
  });

  if (count === 0) {
    return "contended";
  }

  return candidate;
};

/**
 * Run one worker slot: claim a job, run it, and repeat until the queue is empty
 *
 * Each slot is a persistent loop rather than a one-shot batch member — as
 * soon as this slot's job finishes it immediately claims the next one, so a
 * fast job never sits idle waiting on a slower sibling in the same batch to
 * finish (the old batch-claim/`Promise.all`/rebatch design stalled every
 * slot until the whole batch settled). A `"contended"` claim (lost a race
 * against a sibling slot for the same candidate row) retries immediately
 * rather than exiting — otherwise most of the pool would drop out on the
 * first `tick` whenever many slots start together, collapsing concurrency
 * down to whoever happened to win their first race. Only returns once
 * `claimNextJob` reports the queue genuinely `"empty"`; the caller
 * re-invokes all slots together on the next poll tick to pick up newly
 * enqueued work.
 */
const runSlot = async (): Promise<void> => {
  for (;;) {
    const claim = await claimNextJob();

    if (claim === "empty") {
      return;
    }

    if (claim === "contended") {
      continue;
    }

    await runJob(claim);
  }
};

/**
 * Start the background rendition drain loop
 *
 * Runs MAX_CONCURRENCY persistent worker slots (see `runSlot`), each
 * independently claiming and running one RenditionJob at a time until the
 * queue is empty. This is CPU-bound (ffmpeg) work and intentionally runs at
 * full tilt to drain the backlog as fast as possible — it does not back off
 * for other processes sharing the host (Plex, a file server, the crawler's
 * I/O-bound worker pool, etc), so expect CPU contention with them while
 * jobs are queued.
 *
 * All slots run out once the queue empties, so POLL_INTERVAL_MS paces
 * re-checking for newly enqueued work — it's an idle poll, not a per-job
 * wait, since each slot already moves to its next job the instant it's free.
 * Each idle tick does one cheap existence check before spinning up the pool,
 * so a quiet queue costs a single query per tick rather than MAX_CONCURRENCY
 * slots each independently finding nothing to claim.
 */
export const startRenditionWorker = () => {
  console.info(
    `Rendition worker: starting (max_concurrency=${MAX_CONCURRENCY}, poll_interval_ms=${POLL_INTERVAL_MS})`,
  );

  resetStaleRunningJobs().catch((error) =>
    console.error("Failed to reset stale rendition jobs", error),
  );

  let draining = false;

  const tick = async () => {
    if (draining) {
      return;
    }

    // Cheap up-front check so an idle queue costs one query per tick instead
    // of spinning up all MAX_CONCURRENCY slots just to have each of them
    // independently discover there's nothing to claim.
    const has_pending = await db.renditionJob.findFirst({
      where: { status: RenditionJobStatus.Pending },
      select: { id: true },
    });

    if (!has_pending) {
      return;
    }

    draining = true;

    Promise.all(Array.from({ length: MAX_CONCURRENCY }, runSlot))
      .catch((error) => console.error("Rendition worker drain failed", error))
      .finally(() => {
        draining = false;
      });
  };

  setInterval(tick, POLL_INTERVAL_MS);
};
