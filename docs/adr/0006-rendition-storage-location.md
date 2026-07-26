# ADR-0006: Where transcoded renditions are stored

- **Status:** Accepted (storage path amended by [[0008-separate-transcoded-storage-path]] —
  renditions no longer share the `app_data` volume with album art)
- **Date:** 2026-06-27
- **Deciders:** Anthony

## Context

Renditions ([[0003-rendition-generation-and-storage]]) are real files that must be served
efficiently (with range support, [[0004-range-streaming]]) and reused across recrawls. We needed
to decide where they physically live. The codebase already has a precedent: derived media (album
art) is cached on the shared **`app_data`** named volume at `/opt/app/data/albumart`
([`ImageCache.ts`](../../server/lib/media/image/ImageCache.ts)) and served **directly by nginx in
prod** (`app_data` → `/etc/nginx/html/images`, [docker-compose.yml](../../docker-compose.yml)),
with Express serving it only in dev.

## Options considered

- **A. Postgres `Bytes` column** (as `AlbumArt` does) — rejected. Album art is tiny; audio blobs
  would bloat the DB, load into memory, and can't be range-served.
- **B. Alongside the source** under `/opt/app/media` — rejected. Pollutes the user's music folder
  and risks the crawler re-scanning renditions as library tracks.
- **C. Dedicated directory on the `app_data` volume**, nginx-served like album art — **chosen.**

## Decision

1. **Store renditions at `/opt/app/data/transcoded/` on the `app_data` volume**, mirroring the
   album-art pattern.

2. **Treat the directory as a disposable cache.** Renditions are regenerable from source, so it can
   be excluded from backups and safely wiped — wiping just forces a rebuild via the queue.

3. **Shard by checksum prefix** to avoid one oversized directory:
   `transcoded/<aa>/<bb>/<checksum>.<tier>.ogg` (e.g. `transcoded/3f/a9/3fa9….medium.ogg`).

4. **Serving mirrors album art:** nginx serves `/transcoded/` directly in prod; Express serves it
   in dev.

## Consequences

- nginx config needs a new `location` for `/transcoded/` and the `app_data` mount on the nginx
  service (today it only maps `/etc/nginx/html/images`). Per CLAUDE.md, nginx config is manually
  maintained — a known, accepted cost.
- The `app_data` volume grows by the rendition footprint (v1 medium-only is small; full three-tier
  ≈ +15–25% of library — see [[0003-rendition-generation-and-storage]]).
- Orphan cleanup deletes rendition files whose `audio_checksum` no longer exists in the library,
  alongside the existing `deleteOrphans()` flow.
