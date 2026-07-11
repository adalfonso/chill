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

5. **v1 hashes the whole file.** Simpler than hashing just the decoded audio stream. Consequence:
   editing a tag changes the file and re-triggers a transcode. Acceptable — tag edits are rare.
   Hashing only the audio stream (so tag edits don't invalidate renditions) is a deferred
   refinement.

## Consequences

- New migration: `Track.audio_checksum` (nullable to start, backfilled on next full scan).
- `crawl()` no longer destroys playlists — fixes incidental playlist loss on every scan.
- Renditions outlive renames/moves because they key off content, not id or path.
- Path-based identity means a move is seen as delete+add at the `Track` level, but renditions are
  preserved via checksum, so no re-encode cost.
- See [[0003-rendition-generation-and-storage]] for how checksums key the rendition store, and
  [[0006-rendition-storage-location]] for where the files live.
