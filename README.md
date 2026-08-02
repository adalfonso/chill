# Chill

DIY media platform

## Installation

```bash
pnpm i
```

**Initial Setup**

1. You will need to configure Google OAuth for this application.
2. You will need to seed the database with a user that has a Gmail address. Assign the desired email to the env var `ADMIN_EMAIL`.
3. In the `.env` file, temporarily change `DATABASE_URL` to replace "postgres" with "localhost". Then run `pnpm prisma migrate dev`. Revert the change to the `DATABASE_URL` value afterward.

## Environment

Copy the sample env and configure values accordingly.

```bash
cp .env.example .env
```

## Usage

_Project requires Docker_

**Development**

This project uses Tilt to run docker containers for local development:
[Download Tilt](https://docs.tilt.dev/install.html)

Once Tilt is installed, run:

```bash
tilt up
```

Alternatively, development without Tilt can be started with:

```bash
pnpm docker:dev
```

- App served @ `http://localhost:3200`

**Local Development with Chromecast**
Configure your `HOST` env var to be your IP on the local network, not localhost.

---

**Running in Production**

N.b. that the nginx config/docker setup causes the config to be overwritten
by whatever is stored in the local file system, so until it's fixed, `default.conf`
needs to be updated manually.

```bash
pnpm docker
```

---

## Development

#### Prisma

**Changing the schema**
After making changes, run this command to rebuild the schema:

```bash
pnpm prisma:build
```

Then create a migration. You will have to update the host in `DATABASE_URL` from `postgres` to `localhost` (and change it back afterward).

```bash
npx prisma migrate dev --name name_for_migration
```

---

## All commands

| Command           | Description                                                    |
| ----------------- | ---------------------------------------------------------------- |
| `pnpm docker:dev` | Run in docker, HMR enabled and serve @ `http://localhost:3200`  |
| `pnpm docker`     | Build app, run in docker, and serve @ `http://localhost:3200`   |
| `pnpm test`       | Run tests                                                        |
| `pnpm lint`       | Run linter                                                       |
| `pnpm check`      | Run linting, type-checking, and tests                            |
