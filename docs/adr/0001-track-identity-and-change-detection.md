# ADR-0001: Track identity & incremental change detection

- **Status:** Accepted
- **Date:** 2026-06-27
- **Deciders:** Anthony

## Context

Proactive transcoding ("only transcode if the source changed or no copy exists yet") and any
future offline sync both require a **durable track identity** and a way to detect when a
source's audio actually changed.

Today neither exists. [`MediaCrawler.crawl()`](../../server/lib/media/MediaCrawler.ts) deletes
**every** `Track` (and every `Playlist`) at the start of each scan and recreates them, so
`Track.id` is reassigned on every crawl. `Track` stores `file_modified` (ctime) and `file_size`
but no content hash. Every track is therefore "new" on every crawl.

## Decision

1. **Identity = file path.** `Track.path` is already `@unique`. Keep it as the stable handle.

2. **Add `Track.audio_checksum`** — a content hash of the file. Renditions and any future offline
   copies are keyed by `(audio_checksum, tier)`, **not** by `track.id`. This makes a moved/renamed
   file (same bytes, new path) reuse its existing renditions instead of regenerating them.

3. **Two-stage change-detection gate.** On crawl, compare stored `(file_modified, file_size)`
   first. Only when they differ — or the track is new — do we hash the file and (if needed)
   enqueue transcodes. Steady-state recrawls cost one `fs.stat` per file.

4. **Crawler becomes incremental.** Stop the table-wipe in `crawl()`. Upsert tracks by `path`;
   delete only true orphans (paths no longer on disk), which `deleteOrphans()` already models.

5. **v1 fingerprints head + tail + size.** The checksum is a SHA-256 over the file size plus the
   first and last 256KB of content (whole file when smaller than 512KB). Originally v1 hashed
   the whole file, but the backfill scan saturated gigabit NAS throughput (~70MB/s) reading
   every byte of the library; the fingerprint reads at most 512KB per file — around the point
   where per-file round-trip latency, not transfer, dominates, so smaller windows would not be
   faster. Tag edits and truncation land in the head/tail or change the size, so change
   detection is preserved. Note that stale-metadata protection does not rest on the fingerprint
   at all: the (mtime,size) gate triggers a full re-parse on any edit. The fingerprint's job is
   content identity for renditions. Consequence: a modification confined to the middle bytes
   that also preserves file size goes undetected — contrived for audio files. Consequence: a
   tag edit within the head/tail windows changes the fingerprint and re-triggers a transcode;
   one hidden behind large embedded art (outside the windows, size preserved by tag padding)
   leaves the fingerprint unchanged and existing renditions are correctly reused. Hashing only
   the decoded audio stream (so no tag edit ever invalidates renditions) remains a deferred
   refinement.

## Consequences

- New migration: `Track.audio_checksum` (nullable to start, backfilled on next full scan).
- `crawl()` no longer destroys playlists — fixes incidental playlist loss on every scan.
- Renditions outlive renames/moves because they key off content, not id or path.
- Path-based identity means a move is seen as delete+add at the `Track` level, but renditions are
  preserved via checksum, so no re-encode cost.
- See [[0003-rendition-generation-and-storage]] for how checksums key the rendition store, and
  [[0006-rendition-storage-location]] for where the files live.
