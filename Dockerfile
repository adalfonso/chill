FROM node:26-alpine
WORKDIR /usr/src/app

# System packages first: they change rarely, so this layer stays cached
# across dependency and source changes. `apk upgrade` applies OS security
# patches released since the node base image was built. su-exec lets
# entrypoint.sh drop from root to PUID:PGID before starting the app.
RUN apk upgrade --no-cache && apk add --no-cache ffmpeg openssl su-exec

COPY package.json ./
COPY pnpm-lock.yaml ./

# Install the exact pnpm version pinned by the `packageManager` field in
# package.json (e.g. "pnpm@10.29.3+sha512.<hash>"), so local and image builds
# use the same pnpm. Node 25+ no longer bundles corepack, so it is installed
# via npm instead; the "+sha512..." suffix is stripped because npm does not
# accept it as part of a version.
RUN npm i -g "$(node -p 'require("./package.json").packageManager.split("+")[0]')"

# --frozen-lockfile installs exactly what pnpm-lock.yaml records and fails
# the build if package.json and the lockfile disagree.
RUN pnpm i --frozen-lockfile

COPY . .

# Fixes ownership of the app's writable paths, then runs CMD as PUID:PGID
# (default 99:100) rather than root. Named so it does not replace the node
# image's own /usr/local/bin/docker-entrypoint.sh.
COPY --chmod=755 entrypoint.sh /usr/local/bin/chill-entrypoint.sh
ENTRYPOINT ["chill-entrypoint.sh"]

EXPOSE 3201
CMD ["pnpm","start"]
