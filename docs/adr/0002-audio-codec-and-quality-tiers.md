# ADR-0002: Audio codec, quality tiers, and the no-tandem rule

- **Status:** Accepted
- **Date:** 2026-06-27
- **Deciders:** Anthony

## Context

Goals: good sound quality and low cell-data cost in the car. On-the-fly transcoding today is
slow (~5s startup) and produces **mp3 via `sox`** ([`conversion.ts`](../../server/lib/conversion.ts)).
The quality model has five lossy tiers (Trash/Low/Medium/Standard/Extreme, 85–245k) in
[`AudioQualityBitrate`](../../common/types.ts). In the car the phone decodes audio and sends it to
the head unit over **Bluetooth**, which re-encodes (SBC/AAC) — so quality above ~160k is wasted
on that link. Target phone is **Android** (Opus fully supported).

## Decision

1. **Codec = Opus, in an Ogg container** (`audio/ogg`). Opus beats mp3/Vorbis at every bitrate
   and is excellent at the low end. Android Chrome decodes it natively.

2. **Collapse to three lossy tiers + original:**
   | Tier      | Target (Opus VBR) |
   |-----------|-------------------|
   | `low`     | ~64 kbps          |
   | `medium`  | ~96 kbps          |
   | `high`    | ~160 kbps         |
   | `original`| source, untouched |

   **v1 ships `medium` only**, generated across the library to measure throughput before adding
   `low`/`high`. (See [[0003-rendition-generation-and-storage]].)

3. **No-tandem rule.** A lossy source's own bitrate already places it in a tier; never re-encode a
   file that's already at/below a tier's data cost.
   - FLAC / lossless → eligible for all tiers.
   - 320k mp3 → eligible for `low` and `medium` (skip `high`; 160 vs 320 isn't worth the tandem hit).
   - 128k mp3 → **transcode nothing**; stream as-is. It already satisfies `low`/`medium` by size.

4. **Tier resolver replaces the old per-request convert logic.** Given the user's requested
   quality, serve: the matching rendition if it exists, else the **original** when the source's own
   bitrate already satisfies the request, else fall back (see [[0003-rendition-generation-and-storage]]).
   This folds in the "which file satisfies this request" ordering — no separate quality-lattice
   doc, since cross-device (offline) comparison is deferred ([[0005-offline-sync-deferred-to-native-client]]).

5. **Migrate the enum.** Replace the 5-value `AudioQuality` enum + `UserSettings.audio_quality`
   with `original | high | medium | low`. Map existing values (Trash/Low→low, Medium/Standard→medium,
   Extreme→high) in the migration.

## Consequences

- New encoder dependency: **ffmpeg/opusenc** replaces `sox`. On-the-fly fallback also emits Opus
  so a cache miss returns the same format as a cache hit.
- Schema migration on `AudioQuality` + `UserSettings`; client [`AudioQualitySetting`](../../client/components/App/Toolbar/AppSettings/AudioQualitySetting.tsx)
  and the cast path in [`TrackController`](../../server/controllers/TrackController.ts) update to the new tiers.
- Bluetooth caps the top end, so `high` matters only under a future native + Android Auto client
  ([[0005-offline-sync-deferred-to-native-client]]). Data savings (the primary goal) are unaffected by that cap.
- Worth adding the **MediaSession API** client-side for car head-unit metadata/controls over BT — cheap, independent of this codec work.
