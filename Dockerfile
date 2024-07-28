
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN corepack enable
RUN corepack prepare pnpm@latest --activate
RUN apk update & apk add sox
RUN pnpm i
COPY . .
EXPOSE 3201
CMD ["pnpm","start"]