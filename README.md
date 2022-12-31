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

**Using Docker**

There are two ways of running the application; with docker, and without docker.
Running the app within docker is preferred because it requires less manual setup.

1. Install docker
2. Set up mongo volumes and network

```bash
  docker volume create mongodb
  docker volume create mongodb_config
  docker network create mongodb
```

**Development w/Docker**

```bash
  npm run docker:dev
```

- HMR enabled
- App served @ `http://localhost:6400`
- Server run with nodemon

**Production w/Docker**

```bash
  npm run docker
```

- App served @ `http://localhost:6400`

---

**Without Using Docker**

1. Manually set up mongodb on your system

**Development**

```bash
  npm run start:dev
```

- HMR enabled
- App served @ `http://localhost:6400`
- Server run with nodemon

**Production**

```bash
  npm run start
```

- App served @ `http://localhost:6400`

## All commands

| Command              | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `npm run docker:dev` | Build app, HMR enabled, run in docker, and serve @ `http://localhost:6400` |
| `npm run docker`     | Build app, run in docker, and serve @ `http://localhost:6400`              |
| `npm run start:dev`  | Build app, HMR enabled, and serve @ `http://localhost:6400`                |
| `npm run start`      | Build app and serve @ `http://localhost:6400`                              |
| `npm run test`       | Run tests                                                                  |
| `npm run lint`       | Run linter                                                                 |
