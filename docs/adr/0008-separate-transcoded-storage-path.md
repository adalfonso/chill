# ADR-0008: Give transcoded renditions their own storage path

- **Status:** Accepted
- **Date:** 2026-07-26
- **Deciders:** Anthony

## Context

[[0006-rendition-storage-location]] put renditions on the `app_data` volume alongside album art,
reusing that precedent wholesale. In practice `app_data` sits on the host's SSD, and renditions —
regenerable, disposable, and now with `low` shipping eagerly across the whole library
([[0007-collapse-to-two-lossy-tiers]]) — don't need SSD-class storage the way album art (small,
constantly read on every page load) benefits from. The rendition footprint competes with the SSD
for space that's better spent elsewhere.

## Decision

1. **Transcoded renditions get their own bind-mounted path, independent of `app_data`.** The
   original plan was to keep the container path at `/opt/app/data/transcoded` (nested under the
   existing `app_data` mount) so `RenditionCache.ts` wouldn't need to change at all — just shadow
   that one subdirectory with a different mount source. **This didn't work in practice**: under
   Tilt, the nested bind mount was silently not applied — `docker inspect` reported it as present,
   but the container's own `/proc/mounts` showed only the parent `app_data` mount, and writes went
   straight through to the (wrong) `app_data`-backed directory underneath. Verified by comparing
   inode numbers between the container's view and both host candidate paths.

   The fix: **don't nest the mount.** The container path moved to a new top-level
   `/opt/app/transcoded` (a one-line change to `rendition_dir` in
   [`RenditionCache.ts`](../../server/lib/media/RenditionCache.ts)), mounted independently rather
   than as a child of an already-mounted directory. This sidesteps whatever ordering/timing
   assumption the nested case was violating, and doesn't depend on Tilt vs. plain `docker compose`
   behaving identically.

2. **Prod:** a new `TRANSCODED_PATH` env var, following the existing `MEDIA_PATH` convention
   (host-path-only, never read by the Node app — see [`docker-compose.yml`](../../docker-compose.yml)).
   Bind-mounted at `/opt/app/transcoded`.

3. **Dev:** [`docker-compose.dev.yml`](../../docker-compose.dev.yml) hardcodes host paths already
   (doesn't read `.env` path vars at all), so `/srv/chill/transcoded` is hardcoded there too,
   proximal to `/srv/chill/media` rather than under `/srv/chill/data`, mounted at
   `/opt/app/transcoded`. It doesn't need to be on separate physical storage locally — the split
   exists for consistency with prod, not a local requirement.

4. **Album art stays on `app_data`.** Only rendition storage moves; nginx's existing
   `app_data:/etc/nginx/html/images` mapping is unaffected. (In practice nginx never served
   `transcoded/` directly — despite [[0006-rendition-storage-location]] planning a `/transcoded/`
   `location` block, renditions have only ever been served by Express via `TrackController`, so
   there was nothing nginx-side to update here.)

## Consequences

- Existing rendition cache content isn't migrated. In practice, by the time the nested-mount bug
  above was caught, a fresh library-wide `low` encode had already partially landed in the wrong
  (`app_data`-backed) location. Both the DB (`Rendition`/`RenditionJob`) and both candidate
  directories were wiped to guarantee a clean slate rather than trying to reconcile which of two
  locations was authoritative.
- Deploying this requires setting `TRANSCODED_PATH` in prod `.env` before first boot. Rather than
  leave that as an implicit assumption, `docker-compose.yml` uses Compose's required-variable
  interpolation (`${TRANSCODED_PATH:?…}`) so `docker compose up`/`config` fails immediately with a
  clear message if it's unset or empty, instead of silently attempting to mount an empty path.
- General lesson: a nested bind mount (mounting a path under an already-mounted directory) isn't
  reliable enough to assume silently — verify with `/proc/mounts` and inode comparison inside the
  actual running container, not just `docker inspect`'s reported config, before trusting it.
- This amends point 1 of [[0006-rendition-storage-location]] (where renditions physically live).
  That document remains the historical record of the original "reuse the album-art pattern"
  decision; this ADR is the current state.
