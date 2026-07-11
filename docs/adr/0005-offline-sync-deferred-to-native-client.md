# ADR-0005: Offline sync deferred to a future native client

- **Status:** Accepted
- **Date:** 2026-06-27
- **Deciders:** Anthony

## Context

Idea #2 was offline download/sync of albums/tracks/playlists with a chosen bitrate, served locally
when the local copy's quality ≥ the request. Two forces reshaped this:

- **PWA storage reality.** `localStorage` (the original guess) maxes ~5MB and holds strings — it
  cannot store audio. Real options are IndexedDB or a service worker + Cache API, both subject to
  browser **eviction** and quota unless `navigator.storage.persist()` is granted.
- **The car wants Android Auto.** Android Auto routes audio over USB/Wi-Fi and bypasses the
  Bluetooth quality ceiling (see [[0002-audio-codec-and-quality-tiers]]), but **a PWA cannot project
  into Android Auto** — that requires a native Android app built on `androidx.media3` /
  `MediaBrowserService`. A native app would do offline with media3's own download manager + ExoPlayer,
  not web storage.

Building offline twice (web now, native later) is wasted effort.

## Decision

1. **Defer offline sync entirely** out of this effort. No service worker, no Cache API, no
   cross-device quality lattice for now.

2. **Target for v1 = PWA over Bluetooth.** Renditions + range streaming already deliver the data-cost
   win on this path. Bluetooth caps the top quality, but not the savings.

3. **Design the server API so a native client is cheap later.** Stable identity by checksum
   ([[0001-track-identity-and-change-detection]]), clean tier/quality query params on `load`, and
   range streaming ([[0004-range-streaming]]) are all reusable as-is by a native Android + Android
   Auto client. That client is where offline download and the `high`/`original` tiers actually pay off.

## Consequences

- Scope of this round is purely server-side idea #1.
- The "local copy ≥ requested → serve local" rule moves to the future native client.
- No web-storage/quota/eviction work now; revisit when the native client is on the roadmap.
