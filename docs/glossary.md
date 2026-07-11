# Glossary — On-the-go Audio (renditions & streaming)

Terms used by the ADRs in `docs/adr/`. Kept short and project-specific.

- **Source / Original** — The untouched file on disk that the crawler found (FLAC, mp3, etc.).
  In the quality model `original` is the top tier and always available.

- **Rendition** — A pre-encoded, lower-bitrate copy of a source produced for data-efficient
  playback. Renditions are **Opus** (see ADR-0002). Identified by `(audio_checksum, tier)`,
  not by track id (see ADR-0001).

- **Tier** — A named quality level. Lossy tiers are `low` (~64k), `medium` (~96k),
  `high` (~160k), plus `original`. **v1 ships `medium` only.**

- **Tier resolver** — Server logic that maps a user's requested quality to the file to serve:
  a matching rendition, or the original itself when the source's own bitrate already
  satisfies the request (e.g. a 128k mp3 answers a `low`/`medium` request as-is).

- **Tandem encoding / generational loss** — Re-encoding an already-lossy file
  (e.g. 128k mp3 → 64k Opus). The second encoder preserves the first encoder's artifacts
  and discards more signal, so quality drops faster than the bitrate implies. Avoided by the
  no-tandem rule in ADR-0002.

- **Audio checksum** — A content hash stored on each `Track`, used to key renditions and to
  detect source changes. Survives file moves/renames.

- **Change-detection gate** — Cheap `(mtime, size)` comparison done first on every crawl;
  the expensive checksum/transcode only runs when the gate trips. Keeps recrawls fast.

- **Incremental crawl** — The crawler upserts by identity and deletes only true orphans,
  instead of wiping the whole `Track` table each scan (the previous behavior).

- **RenditionJob** — A persisted queue row describing "encode source X to tier T".
  Drains in the background, survives restarts, and doubles as transcode telemetry.

- **On-the-fly fallback** — If a requested rendition isn't built yet, the server transcodes it
  live (slow) for that one request, and bumps its job to the front of the queue so it's cached
  next time.

- **A2DP / Bluetooth ceiling** — Bluetooth re-encodes audio over the air (SBC/AAC), capping
  effective quality at ~256–320k regardless of source. Caps the *top* of the range, not the
  data savings at the bottom.

- **Android Auto** — Routes audio over USB/Wi-Fi instead of A2DP, bypassing the Bluetooth
  ceiling. Requires a **native** Android app; a PWA cannot project into it (see ADR-0005).

- **MediaSession API** — Browser API that exposes track metadata + transport controls to the
  car head unit over Bluetooth. Cheap win, independent of Android Auto.

- **Eager vs lazy transcoding** — Eager pre-builds renditions for the whole library; lazy
  builds a tier the first time it's requested. v1 is eager-medium to measure throughput.
