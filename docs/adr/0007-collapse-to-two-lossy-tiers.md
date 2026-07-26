# ADR-0007: Collapse to two lossy tiers; ship `low` eagerly instead of `medium`

- **Status:** Accepted
- **Date:** 2026-07-26
- **Deciders:** Anthony

## Context

[[0002-audio-codec-and-quality-tiers]] shipped `low`/`medium`/`high` (64/96/160 kbps Opus) plus
`original`, with `medium` generated eagerly per [[0003-rendition-generation-and-storage]] to
measure encode throughput before deciding on `low`/`high`.

A manual side-by-side listening test of all three tiers against source (see
`server/lib/media/renditionTiers.ts` target bitrates) found:

- **`high` (160k):** effectively indistinguishable from the original.
- **`medium` (96k):** a slight, audible difference from the original.
- **`low` (64k):** an obvious difference, but only noticeable if you're listening for it.

`medium` doesn't earn a distinct place in that spectrum — it isn't as transparent as `high` and
isn't meaningfully smaller than `low` for the average listener. It sits in the middle without
serving a use case either extreme doesn't already cover.

## Decision

1. **Drop `medium`.** The lossy tier set collapses to `low` (64k) and `high` (160k), plus
   `original`. `AudioQuality` and `RenditionTier` both lose their `Medium` member
   ([`schema.prisma`](../../prisma/schema.prisma)).

2. **`low` ships eagerly instead of `medium`.** [[0003-rendition-generation-and-storage]]'s eager
   tier was `medium`, chosen to gather timing data. That data collection purpose is satisfied —
   ownership of the eager slot moves to `low`, since it's the tier that actually serves this
   project's original goal (cheap cell data in the car, per ADR-0002's Context). `high` remains
   lazy, built on cache-miss like `low` used to be.

3. **Existing data migrates, it isn't preserved.** A rendition encoded at 96k has no valid tier to
   become — remapping it as `low` or `high` would silently misrepresent its actual bitrate. The
   migration ([`20260726003023_collapse_to_two_tiers`](../../prisma/migrations/20260726003023_collapse_to_two_tiers/migration.sql))
   deletes existing `Medium` `Rendition`/`RenditionJob` rows outright — consistent with the
   rendition cache being disposable ([[0006-rendition-storage-location]]) — and remaps any
   `UserSettings.audio_quality = Medium` to `High`, since `high` tested as the safer
   quality-preserving default when a user's explicit tier disappears out from under them.

## Consequences

- Users who had `medium` selected move to `high` (bigger files, no perceptible loss) rather than
  `low` (smaller, perceptible loss) — see migration note above.
- All on-disk `*.medium.ogg` rendition files become orphaned by the enum change and are deleted
  as part of this change rather than left to rot.
- `enqueueEligibleRenditions` ([`RenditionQueue.ts`](../../server/lib/media/RenditionQueue.ts))
  now enqueues `low` after a scan; `high` continues to rely on the cache-miss fallback
  ([[0003-rendition-generation-and-storage]], point 5).
- This amends point 2 of [[0002-audio-codec-and-quality-tiers]] (tier table) and point 4 of
  [[0003-rendition-generation-and-storage]] (which tier ships eagerly). Those documents are left
  as the historical record of the v1 decision; this ADR is the current state.
