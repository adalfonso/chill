
FROM node:24-alpine
WORKDIR /usr/src/app
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN corepack enable
RUN corepack prepare pnpm@latest --activate
RUN apk add --no-cache sox openssl
RUN pnpm i
COPY . .
EXPOSE 3201
CMD ["pnpm","start"]