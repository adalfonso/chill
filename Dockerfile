FROM node:24-alpine
WORKDIR /usr/src/app

# System packages first: they change rarely, so this layer stays cached
# across dependency and source changes. `apk upgrade` applies OS security
# patches released since the node base image was built.
RUN apk upgrade --no-cache && apk add --no-cache ffmpeg openssl

# Corepack provides the exact pnpm version pinned by the `packageManager`
# field in package.json, so local and image builds use the same pnpm.
RUN corepack enable

COPY package.json ./
COPY pnpm-lock.yaml ./

# --frozen-lockfile installs exactly what pnpm-lock.yaml records and fails
# the build if package.json and the lockfile disagree.
RUN pnpm i --frozen-lockfile

COPY . .
EXPOSE 3201
CMD ["pnpm","start"]
