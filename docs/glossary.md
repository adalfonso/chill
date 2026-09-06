# Glossary

Terms used by the ADRs in `docs/adr/`. Kept short and project-specific.

## Authentication & sessions

- **Device session** — The existing `session_id` in the JWT payload. Identifies one *connected
  device* for WebSocket routing and DeviceConnect, nothing more. Low-entropy (`nanoid(4)`),
  sent to the client, and displayed in the device picker as a fallback device label. It is
  **not** a secret and carries no authority.

- **Login session** — A server-side record of one user's login on one device, and the unit of
  revocation. Outlives any individual access token. Killing it logs that device out; killing
  all of a user's logs them out everywhere. Distinct from **device session** — a login session
  survives reconnects, a device session does not.

- **Access token** — Bounded-lifetime JWT (12h) in the `access_token` cookie, presented on every
  request. Stateless, carries the user and the login session it belongs to. Its lifetime bounds
  revocation lag, not exposure — revoking the login session is what ends access.

- **Refresh token** — Long-lived credential whose only power is to mint a new access token for
  its login session. Never sent on ordinary API requests.

- **Token family** — The chain of refresh tokens descended from one login. Rotation replaces the
  current member with its successor; the family is the unit that reuse detection acts on.

- **Reuse detection** — Presenting a refresh token that has already been rotated away. Since a
  legitimate client always holds the newest member, reuse means the credential was copied, and
  the whole family is revoked.

- **Deny key** — A short-lived cache entry marking a login session as revoked, checked on every
  authenticated request. Makes revocation take effect on the session's next request rather than
  waiting for its access token to expire. Held only as long as the longest access token could
  still be alive.

## On-the-go Audio (renditions & streaming)

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
