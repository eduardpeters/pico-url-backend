# pico-url-backend

A URL shortener REST API built with **Express 5** + **TypeScript 5**, **PostgreSQL 17** (via [Drizzle ORM](https://orm.drizzle.team/)), and JWT authentication.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Framework | Express 5 |
| Language | TypeScript 5 (`NodeNext` modules, `es2022` target) |
| Database | PostgreSQL 17 |
| ORM / Migrations | Drizzle ORM + Drizzle Kit |
| Auth | JSON Web Tokens (`jsonwebtoken`) |
| Validation | Joi |
| Testing | Vitest (unit) + Supertest (integration) |
| Dev server | `tsx watch` |
| Linting / Formatting | ESLint 10 (TypeScript-ESLint) + Prettier |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on |
| `CORS_ORIGIN` | Allowed CORS origin (e.g. your frontend URL) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens |
| `URL_BASE` | Base URL prepended to generated short codes |

### 3. Run database migrations

```bash
npx drizzle-kit migrate
```

### 4. Start the server

```bash
# Development (with file watching / HMR)
npm run dev

# Production build + start
npm run build
npm run start
```

---

## Docker Compose (recommended for local dev)

The included `docker-compose.yml` defines three services:

| Service | Description | Port |
|---|---|---|
| `db` | PostgreSQL 17 (development) | `5432` |
| `db-test` | PostgreSQL 17 (integration tests) | `5433` |
| `app` | Built application (requires `.env`) | `4242` |

```bash
# Start the database + app together
docker compose up app

# Start only the database (for npm run dev)
docker compose up db -d

# Start only the test database (for integration tests)
docker compose up db-test -d

# Tear everything down
docker compose down
```

The `app` service waits for `db` to pass its health check before starting.

### Build and run image manually

```bash
docker build -t pico-url-backend .
docker run -p 4242:4242 --env-file .env pico-url-backend
```

---

## API

Protected routes require an `Authorization: Bearer <token>` header.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/` | No | Log in, receive JWT |
| `POST` | `/api/users/` | No | Register a new user |
| `GET` | `/api/users/` | Yes | Get current user |
| `PATCH` | `/api/users/` | Yes | Update current user |
| `DELETE` | `/api/users/` | Yes | Delete current user (cascades to URLs) |
| `GET` | `/api/urls/` | Yes | List all URLs for current user |
| `POST` | `/api/urls/` | Yes | Shorten a URL (idempotent — returns existing short if URL already exists) |
| `GET` | `/api/urls/count` | Yes | Get URL count for current user |
| `GET` | `/api/urls/:shorturl` | No | Resolve short code → original URL (increments visit counter) |
| `GET` | `/api/urls/info/:shorturl` | Yes | Get full URL details |
| `PATCH` | `/api/urls/:shorturl` | Yes | Update original URL |
| `DELETE` | `/api/urls/:shorturl` | Yes | Delete a shortened URL |
| `GET` | `/health` | No | Health check — returns `200 OK` |

---

## Testing

### Unit tests (no database required)

Tests use Vitest with fully mocked manager/DB layers. Environment variables are loaded from `.env.test` (committed with safe placeholder values).

```bash
npm test                  # run all unit tests once (84 tests)
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

### Integration tests (requires PostgreSQL)

Integration tests hit the full HTTP stack end-to-end (routes → controllers → managers → real DB) using Supertest.

```bash
# Start the test database
docker compose up db-test -d

# Run integration tests (45 tests)
npm run test:integration

# Stop the test database
docker compose down
```

---

## Linting and formatting

```bash
npm run lint      # ESLint (TypeScript-ESLint rules)
npm run format    # Prettier (writes in place)
```

Prettier settings (`.prettierrc`): 4-space indent, single quotes, semicolons, trailing commas, 100-char print width — matching the existing codebase style.

---

## Scripts reference

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `tsx watch server.ts` | Dev server with file watching |
| `npm run build` | `npx tsc` | Compile TypeScript to `./dist` |
| `npm run start` | `node dist/server.js` | Run compiled output |
| `npm test` | `vitest run` | Run unit tests once |
| `npm run test:watch` | `vitest` | Unit tests in watch mode |
| `npm run test:coverage` | `vitest run --coverage` | Unit tests with coverage |
| `npm run test:integration` | `vitest run --config vitest.integration.config.ts` | Integration tests |
| `npm run lint` | `eslint .` | Lint all source files |
| `npm run format` | `prettier --write .` | Format all files |

---

## Database migrations

Migrations are managed with Drizzle Kit. Migration SQL files live in `./drizzle/` and must be committed alongside schema changes.

```bash
# Generate a new migration after schema changes
npx drizzle-kit generate

# Apply pending migrations to the database
npx drizzle-kit migrate
```
