# ADR-0003: Rendition generation, storage, and the job queue

- **Status:** Accepted
- **Date:** 2026-06-27
- **Deciders:** Anthony

## Context

Transcoding the whole library is hours of CPU and must not block scans or fight the crawler's
100 workers. Renditions must be reused across recrawls and survive restarts. We also want to
measure how long transcoding actually takes before committing to all three tiers.

## Decision

1. **Persistent queue: `RenditionJob` table.** The crawler *enqueues* work; it does not transcode
   inline. A background worker drains the queue, throttled so it doesn't starve the crawler.
   Survives restarts (resumable from table state).

   Suggested columns:
   `id, audio_checksum, tier, status (pending|running|done|failed), priority,
   enqueued_at, started_at, finished_at, error, source_codec, source_bitrate, in_bytes, out_bytes`.

2. **Rendition store keyed by content.** Files are named by `audio_checksum` + tier and stored as
   decided in [[0006-rendition-storage-location]]. A `Rendition` row records existence and maps back
   to the source. Keying by checksum (per [[0001-track-identity-and-change-detection]]) means renames
   don't regenerate, and orphan cleanup removes renditions whose checksum no longer exists in the
   library.

3. **Idempotent enqueue.** A job is enqueued only if no rendition exists for `(checksum, tier)` and
   no pending/running job already covers it. This is what makes "recrawl only transcodes what
   changed" true.

4. **v1 = eager `medium` only.** On scan, enqueue `medium` jobs for all eligible sources
   (per the no-tandem rule, [[0002-audio-codec-and-quality-tiers]]). Use the resulting timing data
   to decide whether `low`/`high` go eager or lazy later.

5. **Cache miss = on-the-fly fallback (+ priority bump).** If `load` requests a tier whose rendition
   isn't built yet, transcode it live (Opus, slow) for that request **and** bump its `RenditionJob`
   to the front of the queue so it's cached permanently after. Chosen over "serve next-higher" or
   "make the user wait for the queue."

6. **Telemetry is the queue.** Progress (remaining, avg s/track, throughput, ETA, compression
   ratio) is derived from the timing columns above — surfaced via
   [`LibraryHealthController`](../../server/controllers/LibraryHealthController.ts), mirroring the
   existing `Scan` progress pattern. No separate instrumentation.

## Consequences

- New migrations: `Rendition` and `RenditionJob` tables.
- New background worker process/loop with throttling and restart-safety.
- Derived-media directory needs disk budget (medium-only ≈ small; full three-tier ≈ +15–25% of
  library). Decision on `low`/`high` and eager-vs-lazy deferred until v1 timing is observed.
- [`TrackController.load`](../../server/controllers/TrackController.ts) is rewritten around the tier
  resolver + rendition lookup instead of always-on-the-fly `sox`.
