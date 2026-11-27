#!/bin/sh
#
# Container entrypoint: take ownership of the paths the app writes, then run
# the app as an unprivileged user instead of root.
#
# The app parses untrusted files (music-metadata for tags, ffmpeg for
# transcoding, sharp for cover art); running it unprivileged limits what a
# bug in any of them could reach. This script itself runs as root only long
# enough to fix ownership.
#
# Environment:
#   PUID / PGID  user and group ids to run the app as. Default 99:100, which
#                is Unraid's nobody:users, so files the app creates on shares
#                match everything else there (and survive Unraid's "New
#                Permissions" tool, which resets to that same owner).
#                PUID=0 skips everything below and runs as root (used by
#                docker-compose.dev.yml, whose bind mounts are root-owned on
#                the host).
set -eu

PUID="${PUID:-99}"
PGID="${PGID:-100}"

# Opt-out: run unchanged as root
if [ "$PUID" = "0" ]; then
  exec "$@"
fi

# Paths the app writes. The media library (/opt/app/media) is deliberately
# absent: it is only ever read, and its ownership belongs to the host.
#   /opt/app/data                  album art cache (app_data volume)
#   /opt/app/transcoded            rendition cache (TRANSCODED_PATH)
#   /usr/src/app/dist              client build (public_html volume), receiver
#   /usr/src/app/prisma            `prisma format` rewrites the schema and
#                                  `prisma generate` the client, at startup
#   /usr/src/app/node_modules/.vite-temp
#                                  where Vite bundles its config file during
#                                  the startup build
#   /tmp/app-home                  HOME for npm/pnpm caches and logs; the
#                                  image's own HOME (/root) is not writable
#                                  by PUID
export HOME=/tmp/app-home

for dir in \
  /opt/app/data \
  /opt/app/transcoded \
  /usr/src/app/dist \
  /usr/src/app/prisma \
  /usr/src/app/node_modules/.vite-temp \
  "$HOME"; do
  mkdir -p "$dir"

  # Only touch entries whose owner or group differs, so restarts after the
  # first are near-instant even with a large rendition cache. -h changes a
  # symlink itself rather than whatever it points at.
  find "$dir" \( ! -user "$PUID" -o ! -group "$PGID" \) \
    -exec chown -h "$PUID:$PGID" {} +
done

# Drop root and replace this shell with the app, so it is PID 1's direct
# child and receives stop signals from Docker.
exec su-exec "$PUID:$PGID" "$@"
