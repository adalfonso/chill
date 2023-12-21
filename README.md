# Chill

DIY media platform

## Installation

```bash
pnpm i
```

## Environment

Copy sample env and configure values accordingly.

```bash
cp .env.sample .env
```

## Usage

_Project requires Docker_

**Development**

This project uses tilt to run docker containers for local development:
[Download Tilt](https://docs.tilt.dev/install.html)

Once Tilt is installed, run:

```bash
tilt up
```

Alternatively development without Tilt can be started with:

```bash
npm run docker:dev
```

- App served @ `http://localhost:3200`

**Initial Startup**
When setting up this repo for the first time, you will need to configure google oauth and seed the database with a user that has a gmail address.

**Local Development with Chromecast**
Configure your HOST env var to be your IP on the local network, not localhost.

---

**Running in Production**

```bash
npm run docker
```

---

## All commands

| Command              | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `npm run docker:dev` | Run in docker, HMR enabled and serve @ `http://localhost:3200` |
| `npm run docker`     | Build app, run in docker, and serve @ `http://localhost:3200`  |
| `npm run test`       | Run tests                                                      |
| `npm run lint`       | Run linter                                                     |
| `npm run check`      | Run linting, type-checking, and tests                          |
