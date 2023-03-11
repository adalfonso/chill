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
