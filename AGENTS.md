# AGENTS.md — pico-url-backend

## Project Overview

URL shortener REST API built with Express + TypeScript, PostgreSQL (Drizzle ORM), and JWT authentication.
ESM module system (`"type": "module"` in package.json).

## Build / Run Commands

```bash
# Build (compile TypeScript to ./dist)
npm run build          # runs: npx tsc

# Start (run compiled output)
npm run start          # runs: node dist/server.js

# Dev server with file watching (HMR)
npm run dev            # runs: tsx watch server.ts

# Type-check without emitting
npx tsc --noEmit

# Run all unit tests once
npm test                # runs: vitest run

# Run tests in watch mode
npm run test:watch      # runs: vitest

# Run tests with coverage
npm run test:coverage   # runs: vitest run --coverage

# Run integration tests (requires db-test Docker container on port 5433)
npm run test:integration  # runs: vitest run --config vitest.integration.config.ts
```

## Database Migrations

Migrations are managed with Drizzle Kit and must be run manually.

```bash
# Generate a new migration after schema changes
npx drizzle-kit generate

# Apply pending migrations to the database
npx drizzle-kit migrate
```

Migration SQL files are stored in `./drizzle/`. Always commit generated migration files alongside schema changes.

## Tests

Unit tests use **Vitest** with mocked manager/DB layers (no real database required).

Test files live alongside the code they test in `__tests__` subdirectories:

```
src/helpers/__tests__/validation.test.ts
src/middleware/__tests__/verifyJWT.test.ts
src/controllers/__tests__/authController.test.ts
src/controllers/__tests__/usersController.test.ts
src/controllers/__tests__/urlsController.test.ts
```

Environment variables for tests are loaded from `.env.test` via a Vitest setup file (`src/test-setup.ts`).
`.env.test` must exist at the project root (copy `.env.test` is committed with safe placeholder values — do not use real secrets).

### Integration Tests

Integration tests use **supertest** to hit the Express HTTP layer end-to-end (routes → controllers → managers → real Postgres DB). No mocking.

Test files live in `tests/integration/`:

```
tests/integration/auth.test.ts    # 6 tests — POST /api/auth
tests/integration/users.test.ts   # 16 tests — POST/GET/PATCH/DELETE /api/users
tests/integration/urls.test.ts    # 23 tests — full URL lifecycle
```

Integration tests require the `db-test` Docker container (Postgres 17, port 5433):

```bash
# Start the test database
docker compose up db-test -d

# Run integration tests
npm run test:integration

# Stop the test database
docker compose down
```

Key implementation notes:
- `src/test-utils/db.ts` provides `setupTestDb()` (runs Drizzle migrations), `teardownTestDb()` (closes connection), and `truncateTables()` (`TRUNCATE users CASCADE`) helpers used in `beforeAll`/`afterAll`/`afterEach` hooks.
- `vitest.integration.config.ts` uses `fileParallelism: false` (sequential file execution) to prevent concurrent migration race conditions.
- `tests/integration/**` is excluded from the default `vitest.config.ts` so `npm test` never requires a database.
- Postgres emits harmless `NOTICE` messages to stdout during tests (e.g. cascade notices, schema already exists) — these are not errors.

## Linting / Formatting

**No linting or formatting tools are configured** (no ESLint, Prettier, or EditorConfig).
Follow the existing code style conventions described below.

## Project Structure

```
server.ts                             # Entry point: connects DB and starts listening
src/
├── app.ts                            # Express app setup (exported, no listen)
├── test-setup.ts                     # Loads .env.test for unit tests
├── test-utils/
│   └── db.ts                         # setupTestDb, teardownTestDb, truncateTables (integration tests)
├── controllers/              # Request handlers (business logic + HTTP responses)
│   ├── authController.ts     # Login/auth: JWT token generation
│   ├── urlsController.ts     # CRUD for shortened URLs
│   └── usersController.ts    # User registration, get, update, delete
├── db/
│   ├── connect.ts            # postgres.js pool + Drizzle instance, connectToDatabase()
│   └── schema.ts             # Drizzle table definitions (users, urls)
├── helpers/
│   └── validation.ts         # Joi validation schemas
├── managers/                 # Data access layer (static class methods wrapping Drizzle)
│   ├── urlsManager.ts        # URL CRUD against PostgreSQL
│   └── usersManager.ts       # User CRUD against PostgreSQL
├── middleware/
│   └── verifyJWT.ts          # JWT verification middleware
├── routes/                   # Express Router definitions
│   ├── authRoute.ts
│   ├── urlsRoute.ts
│   └── usersRoute.ts
└── types/
    ├── auth.ts               # RequestUser interface (for JWT-authenticated requests)
    ├── url.ts                # UrlSelect, UrlInsert (derived from Drizzle schema)
    └── user.ts               # UserSelect, UserPublic, UserInsert, UpdatedUser (derived from Drizzle schema)
drizzle.config.ts             # Drizzle Kit configuration
drizzle/                      # Generated SQL migration files
tests/
└── integration/
    ├── auth.test.ts          # 6 integration tests — POST /api/auth
    ├── users.test.ts         # 16 integration tests — POST/GET/PATCH/DELETE /api/users
    └── urls.test.ts          # 23 integration tests — full URL lifecycle
```

## Architecture

Layered MVC-like pattern: **Routes -> Controllers -> Managers -> Schema**.

- **Routes** define Express endpoints and attach middleware.
- **Controllers** handle request/response, validation, and orchestration.
- **Managers** are static classes that wrap Drizzle queries (data access layer).
- **Schema** (`src/db/schema.ts`) defines Drizzle table definitions used as the source of truth for both queries and TypeScript types.

## Code Style Guidelines

### TypeScript & Module System

- **Strict mode** is enabled in tsconfig.json.
- **ESM imports** throughout. Local imports MUST use `.js` extension:
  ```ts
  import urlsManager from '../managers/urlsManager.js';
  ```
- Type imports use `.js` extension (same as regular imports):
  ```ts
  import { RequestUser } from '../types/auth.js';
  import type { UserSelect } from '../types/user.js';
  ```
- Target: `es2020`, Module: `ESNext`, Module resolution: `node`.

### Formatting

- **Indentation:** 4 spaces.
- **Quotes:** Single quotes for all strings.
- **Semicolons:** Always used at end of statements.
- **Trailing commas:** Used in object literals and function arguments.

### Naming Conventions

| Element           | Convention                     | Example                          |
|-------------------|--------------------------------|----------------------------------|
| Files             | camelCase                      | `urlsController.ts`              |
| Types             | PascalCase                     | `UserSelect`, `UserPublic`       |
| Manager classes   | camelCase (project convention) | `class usersManager`             |
| Functions         | camelCase                      | `registerUser`, `getAllUrls`      |
| Constants         | SCREAMING_SNAKE_CASE           | `SHORTIDLENGTH`                  |
| Variables         | camelCase                      | `urlEntry`, `hashedPassword`     |
| Router variables  | `router`                       | `const router = express.Router()`|

### Export Patterns

- **Controllers:** Default export of an object with named function properties:
  ```ts
  export default { registerUser, getUser, deleteUser, updateUser };
  ```
- **Managers:** Default export of the class:
  ```ts
  export default usersManager;
  ```
- **Middleware:** Default export of the function.
- **Routes:** Default export of the router.
- **Helpers/Validation:** Named exports:
  ```ts
  export function validateUser(...) { ... }
  ```
- **Types:** Named exports from regular `.ts` files (not `.d.ts`):
  ```ts
  export type UserSelect = typeof users.$inferSelect;
  ```

### Error Handling

- Every async controller function uses **try/catch**.
- Errors are logged with `console.error(error)`.
- HTTP error responses use **plain text strings** (not JSON):
  ```ts
  res.status(400).send('Invalid request body');
  res.status(404).send('Resource not found');
  res.status(500).send('Server error');
  ```
- No custom error classes or centralized error middleware — errors are handled inline.
- Common status codes: `200`, `201`, `204`, `400`, `401`, `404`, `500`.

### Types

- Domain types live in `src/types/` split by domain: `user.ts`, `url.ts`, `auth.ts`.
- Types are derived from the Drizzle schema using `$inferSelect` / `$inferInsert` to stay automatically in sync with schema changes:
  ```ts
  export type UserSelect = typeof users.$inferSelect;
  export type UserPublic = Omit<UserSelect, 'hashedPassword'>;
  ```
- JWT-authenticated request user is accessed via type assertion:
  ```ts
  (req as Request & RequestUser).user.id
  ```
- Environment variables are cast with `as string`:
  ```ts
  process.env.JWT_SECRET as string
  ```
- Joi is used for runtime request body validation alongside TypeScript types.

## Environment Variables

Required (loaded via `dotenv`):

| Variable       | Description                                    |
|----------------|------------------------------------------------|
| `PORT`         | Server port (Dockerfile exposes 4242)          |
| `CORS_ORIGIN`  | Allowed CORS origin                            |
| `DATABASE_URL` | PostgreSQL connection string                   |
| `JWT_SECRET`   | Secret key for JWT signing                     |
| `URL_BASE`     | Base URL for constructing short URLs           |

Copy `.env.example` to `.env` and fill in your values before running the server.

**Never commit `.env` files.** The `.gitignore` already excludes them. Keep `.env.example` up to date whenever new variables are added.

## Dependencies

**Runtime:** express (v5), drizzle-orm, postgres, cors, dotenv, bcrypt, jsonwebtoken, joi, nanoid (v5, ESM-only).
**Dev:** typescript (v5), tsx (watch mode / HMR), drizzle-kit, vitest, supertest, @types/node, @types/express, @types/bcrypt, @types/cors, @types/jsonwebtoken, @types/supertest.

### Express 5 Notes

- Route params (`req.params.*`) are typed as `string | string[]`. Use `as string` for simple `:param` routes.
- `app.listen` callback receives an optional `error` argument.
- Async handlers automatically forward rejected promises to error middleware.
- Path matching syntax changed: wildcards need names (`/*splat`), `?` replaced by braces (`{.:ext}`).

## Docker

```bash
docker build -t pico-url-backend .
docker run -p 4242:4242 --env-file .env pico-url-backend
```

Base image: `node:18`. Build runs `npm install` then `npm run build`. Entry: `node dist/server.js`.
