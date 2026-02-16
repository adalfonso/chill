# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chill is a DIY home media server built with TypeScript. It scans local audio files, indexes them with Elasticsearch, and provides a web UI for playback with Chromecast support and multi-device synchronization via WebSockets.

## Development Commands

### Setup

```bash
# Install dependencies (requires pnpm)
pnpm i

# Copy environment template and configure
cp .env.example .env

# Initial database setup (see README for Google OAuth setup)
# Temporarily change DATABASE_URL from "postgres" to "localhost", then:
pnpm prisma migrate dev
# Revert DATABASE_URL back to "postgres"
```

### Running the Application

```bash
# Development with Tilt (recommended - requires Tilt installed)
tilt up

# Development with Docker Compose only
pnpm docker:dev

# Production
pnpm docker

# App runs at http://localhost:3200
```

### Development Tasks

```bash
# Run tests with coverage and watch mode
pnpm test

# Linting
pnpm lint

# Type-checking + linting + tests
pnpm check

# Build client and receiver apps
pnpm build

# After schema changes: rebuild Prisma client
pnpm prisma:build

# Create database migration (requires DATABASE_URL host = localhost)
npx prisma migrate dev --name migration_name
```

## Architecture Overview

### Monorepo Structure

- **`client/`** - Preact frontend with Preact Signals for state management
- **`server/`** - Express backend with tRPC API layer
- **`common/`** - Shared types and utilities between frontend/backend
- **`receiver/`** - Chromecast receiver application (separate Vite build)
- **`prisma/`** - Database schema and migrations
- **`views/`** - Static HTML pages (login)

### Technology Stack

**Frontend**: Preact, Preact Signals, tRPC client, Wouter (routing), WebSockets
**Backend**: Express, tRPC, Prisma ORM, Passport.js (Google OAuth + JWT), WebSockets (ws)
**Infrastructure**: PostgreSQL, Redis (JWT blacklist), Elasticsearch (search), Nginx (reverse proxy)

### Key Architectural Patterns

#### tRPC Type-Safe API

The API is defined via tRPC routers in `server/routes/api/v1/trpc/`. Each router (Album, Artist, Track, etc.) exports route definitions that map to controller methods.

**Example Router** (`server/routes/api/v1/trpc/TrackRouter.ts`):
```typescript
export const TrackRouter = (routes: typeof router) =>
  routes({
    get: procedure.input(schema.get).query(TrackController.get),
    search: procedure.input(schema.search).query(TrackController.search),
  });
```

**Controllers** (`server/controllers/`) export Zod schemas and methods that receive type-safe validated input:
```typescript
export const schema = { get: z.object({ album_id: z.number() }) };
export const get = (req: Request<typeof schema.get>) => { ... };
```

**Client usage** (`client/client.ts`):
```typescript
const tracks = await api.track.get.query({ album_id: 123 });
```

Admin-only routes use `admin_procedure` which validates `req.user.type === UserType.Admin`.

#### Authentication Flow

1. **Login**: Google OAuth → Passport validates → JWT generated with session_id → stored in httpOnly cookie
2. **Request**: Express middleware chain `[hasValidToken, tokenNotRevoked, storeTokenPayload]` validates JWT and checks Redis blacklist
3. **Logout**: JWT added to Redis with TTL matching token expiration

All `/api/v1/*` routes require authentication via the `isAuthenticated` middleware.

#### Media Scanning

The **MediaCrawler** (`server/lib/media/MediaCrawler.ts`) uses a worker-pool pattern:

1. Queue-based recursive directory traversal
2. Worker pool (default 100 workers) processes files concurrently
3. Uses `music-metadata` to extract tags, duration, bitrate, album art
4. Batched database writes (default 500 records) with ordered upserts:
   - Genres and Artists (parallel)
   - Albums (requires Artists)
   - Tracks (requires all above)
5. Post-scan: rebuilds Elasticsearch index and caches album art

Album art is deduplicated by SHA-256 checksum. Orphaned records are cleaned after scan completion.

#### Search Architecture

Elasticsearch maintains a single "music" index with documents typed as artist/album/genre/track. Custom analyzer with stemming and ASCII folding enables fuzzy matching. Full reindex occurs after media scans.

Search results include navigation paths (e.g., `/artist/123/album/456`) for deep linking.

#### WebSocket Multi-Device Sync

**SocketServer** (`server/lib/io/SocketServer.ts`) manages WebSocket connections with:
- Client tracking by session_id and user_id
- Ping/pong heartbeat mechanism
- Typed event system (ClientSocketEvent, ServerSocketEvent, DuplexEvent, TargetEvent)

**DeviceConnect** enables "source" devices to control "target" devices for playback:
- Connection flow: Request → Accept/Deny → Active → Disconnect
- Multiple sources can connect to one target
- Supports play, pause, seek, volume, and status events

### Important Conventions

**Path Aliases**: TypeScript paths are configured for `@server/*`, `@client/*`, `@common/*`

**Type Sharing**: Never import Prisma types into `client/` - use shared types from `common/types.ts` to avoid breaking the frontend bundle.

**Database URL Switching**: Prisma migrations require changing `DATABASE_URL` from `postgres` (Docker service name) to `localhost`, running the migration, then reverting. This is because migrations run from the host, not inside Docker.

**Media Serving**:
- Audio streams: `/api/v1/media/:id/load` (transcodes based on user quality setting)
- Album art: `/api/v1/media/cover/:filename?size=256` (Sharp resizes on-demand)
- Chromecast: `/cast/media/:id.mp3` (JWT token authentication)

**Singleton Services**:
- Database: `db` from `server/lib/data/db.ts`
- Redis: `Cache.instance()` after `Cache.connect()`
- Elasticsearch: `Search.instance()` after `Search.connect()`

**Environment Variables**: Managed by `env` singleton (`server/lib/env.ts`) with startup validation for required vars.

**Docker Volume Names**: Use underscores in `docker-compose.yml` volume definitions (e.g., `elastic_search`, not `elastic-search`) to match volume mount references consistently.

## Production Deployment

The Docker Compose setup supports environment-based configuration via `.env`:

```bash
MEDIA_PATH=/path/to/music
SSL_PATH=/path/to/certs
NGINX_CONFIG_PATH=/path/to/nginx
```

The nginx config requires manual updates (stored in persistent volume) until a fix is implemented.

CSP headers in `nginx.conf` are configured for security - maintain strict CSP policies for XSS protection.

## Testing

Tests are located in `tests/` and use Jest. Run `pnpm test` for watch mode with coverage.
