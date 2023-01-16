# Chill

DIY media platform

## Installation

```bash
  npm i
```

## Environment

Copy sample env and configure values accordingly

```bash
  cp .env.sample .env
```

## Usage

_Project requires Docker_

**Development**

```bash
  npm run docker:dev
```

- HMR enabled
- App served @ `http://localhost:1337`
- Server run with Nodemon and Vite Dev Server

**Running in Production**

```bash
  npm run docker
```

---

## All commands

| Command              | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `npm run docker:dev` | Run in docker, HMR enabled and serve @ `http://localhost:1337` |
| `npm run docker`     | Build app, run in docker, and serve @ `http://localhost:1337`  |
| `npm run test`       | Run tests                                                      |
| `npm run lint`       | Run linter                                                     |
| `npm run check`      | Run linting, type-checking, and tests                          |
