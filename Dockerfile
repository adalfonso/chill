
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN corepack enable
RUN corepack prepare pnpm@7.25.0 --activate
RUN apk update & apk add sox
RUN pnpm i
COPY . .
EXPOSE 1337
CMD ["pnpm","start"]