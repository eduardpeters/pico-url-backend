# Migration Plan: pico-url-backend Modernization

## Decisions Made

| Decision           | Choice                                                     |
| ------------------ | ---------------------------------------------------------- |
| ORM                | Drizzle ORM                                                |
| DB Driver          | postgres.js (`postgres` npm package)                       |
| Primary Keys       | UUID with `defaultRandom()`                                |
| Cascade            | `ON DELETE CASCADE` for user -> urls FK                    |
| Test Framework     | Vitest                                                     |
| Test Strategy      | Unit tests (mocked DB) + Integration tests (real Postgres) |
| Dev Server / HMR   | `tsx watch`                                                |
| Dependency Updates | All bumped to latest, including major versions             |

---

## Phase 1: Update Dependencies & Dev Tooling — COMPLETED

All dependencies bumped to latest. `tsx` added for HMR dev server.

### Dependency Versions (current)

| Package               | Version | Notes                                      |
| --------------------- | ------- | ------------------------------------------ |
| `express`             | ^5.2.1  | Upgraded from v4                           |
| `@types/express`      | ^5.0.6  | Matches Express 5                          |
| `bcrypt`              | ^6.0.0  | Upgraded from v5                           |
| `@types/bcrypt`       | ^6.0.0  | Matches bcrypt 6                           |
| `cors`                | ^2.8.6  | Patch bump                                 |
| `@types/cors`         | ^2.8.19 | Patch bump                                 |
| `dotenv`              | ^17.3.1 | Upgraded from v16                          |
| `joi`                 | ^18.0.2 | Upgraded from v17                          |
| `jsonwebtoken`        | ^9.0.3  | Patch bump                                 |
| `@types/jsonwebtoken` | ^9.0.10 | Patch bump                                 |
| `nanoid`              | ^5.1.6  | Upgraded from v4                           |
| `@types/node`         | ^24.0.0 | Upgraded from v18                          |
| `typescript`          | ^5.9.3  | Upgraded from v4                           |
| `tsx`                 | ^4.21.0 | **New** — dev dependency                   |
| `drizzle-orm`         | ^0.45.1 | **New** — added in Phase 2                 |
| `postgres`            | ^3.4.8  | **New** — added in Phase 2                 |
| `drizzle-kit`         | ^0.31.9 | **New** — dev dependency, added in Phase 2 |

### Code Changes Made

1. **`package.json`** — Bumped all versions, added `tsx` dev dep, added `"dev": "tsx watch app.ts"` script.
2. **`app.ts:29`** — Updated `app.listen` callback to accept Express 5's optional error argument.
3. **`src/controllers/urlsController.ts:21,52,100,123`** — Added `as string` casts to `req.params.shorturl` (Express 5 types params as `string | string[]`).
4. **`AGENTS.md`** — Added `npm run dev` command, Express 5 notes, updated dependency versions.

### Verification

- `npx tsc --noEmit` passes with zero errors.
- `npm run build` compiles cleanly to `dist/`.
- `tsx app.ts` starts successfully (fails at Postgres connection as expected without `.env`).
- `tsx watch app.ts` watch mode works correctly.

---

## Phase 2: MongoDB to Postgres Migration — COMPLETED

Replaced Mongoose with Drizzle ORM + postgres.js. All MongoDB-specific code removed.

### What was done

#### Dependencies

- Installed: `drizzle-orm`, `postgres` (runtime); `drizzle-kit` (dev)
- Removed: `mongoose`, `express-mongo-sanitize`

#### `src/db/schema.ts` — created

Drizzle table definitions. TypeScript property names are camelCase; SQL column names are snake_case via the `name` option.

**`users` table:**

```
id              uuid          PRIMARY KEY, defaultRandom()
name            varchar(50)   NOT NULL
email           varchar(255)  NOT NULL, UNIQUE
hashedPassword  varchar(1024) NOT NULL  → SQL column: hashed_password
created         timestamp     DEFAULT now()
```

**`urls` table:**

```
id       uuid         PRIMARY KEY, defaultRandom()
userId   uuid         NOT NULL, REFERENCES users(id) ON DELETE CASCADE  → SQL column: user_id
original text         NOT NULL, UNIQUE
short    varchar(10)  NOT NULL, UNIQUE
visits   integer      NOT NULL, DEFAULT 0
created  timestamp    DEFAULT now()
```

#### `src/db/connect.ts` — rewritten

- postgres.js client initialized from `DATABASE_URL` env var (renamed from `MONGODB_URI`)
- `drizzle()` instance exported as named export `db`
- `connectToDatabase()` exported as named export (changed from default export) — runs `SELECT 1` to verify connection

#### `src/db/schema.ts` — created (see above)

#### `drizzle.config.ts` — created

Drizzle Kit config at project root pointing at `src/db/schema.ts`, outputting migrations to `./drizzle/`, dialect `postgresql`.

#### `drizzle/0000_dark_toxin.sql` — generated

Initial migration SQL created by `npx drizzle-kit generate`. Apply with `npx drizzle-kit migrate`.

#### Types — `src/types/picodeclarations.d.ts` deleted, replaced with three domain files

- **`src/types/user.ts`** — `UserSelect`, `UserPublic` (`Omit<UserSelect, 'hashedPassword'>`), `UserInsert`, `UpdatedUser` — all derived from `typeof users.$inferSelect` / `$inferInsert`
- **`src/types/url.ts`** — `UrlSelect`, `UrlInsert` — derived from `typeof urls.$inferSelect` / `$inferInsert`
- **`src/types/auth.ts`** — `RequestUser` interface (`{ user: { _id: string } }`)

#### `src/models/url.ts` and `src/models/user.ts` — deleted

Replaced by the Drizzle schema.

#### `src/managers/usersManager.ts` — rewritten

All Mongoose queries replaced with Drizzle. Document-to-object helper functions removed (UUIDs are native strings). `getById` and `createUser` and `updateUser` use a column-level `.returning()` select to return `UserPublic` (no `hashedPassword`).

#### `src/managers/urlsManager.ts` — rewritten

All Mongoose queries replaced with Drizzle. Atomic visits increment uses `sql\`${urls.visits} + ${amount}\``template.`getCount`returns a plain`number`(extracted from Drizzle's`count()` result).

#### Controllers and middleware — updated

- **`src/controllers/authController.ts`** — `user.password` → `user.hashedPassword`, `user._id` → `user.id`
- **`src/controllers/usersController.ts`** — `password` → `hashedPassword` in `createUser` call and `updateUser` body; imports from new type files
- **`src/controllers/urlsController.ts`** — `entry.shortUrl` → `entry.short`, `entry.originalUrl` → `entry.original`, `urlEntry._id` → `urlEntry.id`; imports from new type files
- **`src/middleware/verifyJWT.ts`** — import updated to `src/types/auth.js`
- **`src/helpers/validation.ts`** — removed `picodeclarations` import; parameter types replaced with inline object shapes

#### `app.ts` — updated

Removed `express-mongo-sanitize` import and `app.use(ExpressMongoSanitize())`. Updated `connectToDatabase` to named import.

#### `AGENTS.md` — updated

Reflects new stack (Drizzle/Postgres), `DATABASE_URL` env var, migration commands, updated project structure, updated dependency list, updated type conventions.

#### `.env.example` — created

Documents all five required environment variables with placeholder values. Developers copy to `.env` before running.

#### `README.md` — expanded

Added getting-started guide (install → copy `.env.example` → migrate → run), full API endpoint table, and Docker instructions.

### Verification

- `npx tsc --noEmit` passes with zero errors.
- `npx drizzle-kit generate` produces `drizzle/0000_dark_toxin.sql` with correct schema.

---

## Phase 3: Add Vitest & Unit Tests — COMPLETED

### What was done

#### Dependencies

- Installed: `vitest@4.0.18` (dev)

#### `vitest.config.ts` — created

```ts
export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./src/test-setup.ts'],
    },
});
```

Note: Vitest 4 does not support an `envFile` option in config. A `setupFiles` entry is used instead to load `.env.test` before each test file runs.

#### `src/test-setup.ts` — created

Loads `.env.test` via `dotenv.config({ path: '.env.test' })` so all `process.env.*` values are available to tests without a real environment.

#### `.env.test` — created

Committed to the repository with safe placeholder values for all five required env vars (`PORT`, `CORS_ORIGIN`, `DATABASE_URL`, `JWT_SECRET`, `URL_BASE`). Does not contain real secrets.

#### `package.json` — updated

Replaced the placeholder `test` script; added `test:watch` and `test:coverage`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

#### Test files — created (84 tests across 5 files)

All controller tests mock the manager layer entirely (`vi.mock`) so no database connection is ever attempted.

| Test File                                           | Tests | Coverage                                                                                                                                                                                                               |
| --------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/helpers/__tests__/validation.test.ts`          | 30    | All 4 Joi schemas — valid/invalid inputs, boundary values, edge cases                                                                                                                                                  |
| `src/middleware/__tests__/verifyJWT.test.ts`        | 5     | Missing token, no Bearer value, valid token → `next()` + `req.user` set, invalid token, expired token                                                                                                                  |
| `src/controllers/__tests__/authController.test.ts`  | 6     | Validation failure, user not found, wrong password, successful login (JWT signed + user info returned), DB error                                                                                                       |
| `src/controllers/__tests__/usersController.test.ts` | 16    | Register (success, duplicate email, validation error, DB errors), getUser (found, not found, DB error), deleteUser (success, DB error), updateUser (partial fields, password hashed, not found, DB error)              |
| `src/controllers/__tests__/urlsController.test.ts`  | 27    | getAllUrls, getUrl (ownership check), getUrlCount, getOriginalUrl (visit increment), createUrl (idempotent existing URL, new URL, nanoid called), updateUrl (ownership check), deleteUrl (ownership check, idempotent) |

#### `AGENTS.md` — updated

- Tests section replaced: now accurately describes Vitest, test file locations, and `.env.test` setup.
- Build/Run Commands section updated: `npm test`, `test:watch`, `test:coverage` added.

#### `README.md` — updated

Testing section added documenting the three test commands and the `.env.test` approach.

### Verification

- `npm test` passes: **5 test files, 84 tests, 0 failures**.
- `npx tsc --noEmit` continues to pass with zero errors.

---

## Phase 4: Integration Tests — COMPLETED

### What was done

The integration tests use **supertest** to hit the Express HTTP layer end-to-end (routes → controllers → managers → real DB). The original plan said "manager-level, no HTTP" but the decision was revised to HTTP-layer only for more realistic coverage.

#### Key implementation decisions / discoveries

- `src/app.ts` split from `server.ts`: `src/app.ts` exports the configured Express app (no listen); `server.ts` is the new entry point that connects the DB and calls `app.listen`.
- `src/test-utils/db.ts` uses its own dedicated postgres client (isolated from the app's `connect.ts` singleton) so test teardown doesn't affect the app connection pool.
- `vitest.integration.config.ts` uses `fileParallelism: false` (sequential file execution) — running files in parallel caused a race condition where multiple files each created their own postgres client and tried to run `migrate()` concurrently, colliding on `CREATE SCHEMA "drizzle"`.
- `vitest.config.ts` was updated to add `exclude: ['tests/integration/**', 'node_modules/**']` so `npm test` never picks up integration test files or requires a database.
- Postgres emits harmless `NOTICE` messages to stdout during tests (e.g. `truncate cascades to table "urls"`, `schema "drizzle" already exists, skipping`) — these are not errors.

#### `src/app.ts` + `server.ts` — app/entry point split

- `src/app.ts`: Express app configuration (middleware, routes). Exported as default. No `listen`.
- `server.ts`: Calls `connectToDatabase()` then `app.listen(PORT)`. `package.json` `start` and `dev` scripts updated accordingly.

#### `src/test-utils/db.ts` — created

- `setupTestDb()`: Creates a dedicated postgres client + Drizzle instance, runs `migrate()` against the test DB.
- `teardownTestDb()`: Calls `client.end()` to close the test client.
- `truncateTables()`: Executes `TRUNCATE users CASCADE` to wipe both tables between tests.

#### `vitest.integration.config.ts` — created

```ts
export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./src/test-setup.ts'],
        include: ['tests/integration/**/*.test.ts'],
        testTimeout: 15000,
        hookTimeout: 30000,
        fileParallelism: false,
    },
});
```

#### `vitest.config.ts` — updated

Added `exclude: ['tests/integration/**', 'node_modules/**']` to prevent `npm test` from picking up integration test files.

#### Integration test files — created (45 tests across 3 files)

| Test File                         | Tests | Coverage                                                                                                  |
| --------------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| `tests/integration/auth.test.ts`  | 6     | POST /api/auth — valid login, wrong password, non-existent user, missing fields, invalid email format     |
| `tests/integration/users.test.ts` | 16    | POST/GET/PATCH/DELETE /api/users — full user lifecycle, cascade delete, auth enforcement                  |
| `tests/integration/urls.test.ts`  | 23    | POST/GET/PATCH/DELETE /api/urls — full URL lifecycle, idempotency, visit increment, ownership enforcement |

### Verification

- All 45 integration tests pass against a live `db-test` Postgres container.
- `npm test` (unit tests, 84 tests) continues to pass independently with no database required.

---

## Phase 5: Final Cleanup & DX Polish — COMPLETED

### What was done

#### `tsconfig.json` — updated

- `target` bumped from `es2020` to `es2022`
- `module` changed from `ESNext` to `NodeNext`
- `moduleResolution` changed from `node` to `NodeNext`
- File re-indented to 4 spaces for consistency with the rest of the codebase

#### `src/app.ts` — updated

Added a `GET /health` endpoint returning `200 OK`, required by the Dockerfile `HEALTHCHECK`.

#### `Dockerfile` — updated

- Added a `HEALTHCHECK` instruction that polls `GET /health` every 30 s (5 s timeout, 10 s start period, 3 retries)
- Converted to a **multi-stage build**: a `builder` stage installs all dependencies and compiles TypeScript; a `production` stage installs only production dependencies (`npm ci --omit=dev`) and copies `dist/` and `drizzle/` only, keeping the final image lean
- `package.json` `build` script simplified from `npx tsc` to `tsc`

#### `docker-compose.yml` — updated

- Added `app` service: builds from the local Dockerfile, maps port `4242:4242`, depends on `db` with `condition: service_healthy` so it waits for Postgres readiness before starting
- Added `healthcheck` to the `db` service (`pg_isready`) to support the above dependency condition
- `app` service given an explicit `DATABASE_URL` environment variable using the `db` service name as the host
- Re-indented to 4 spaces

#### ESLint + Prettier — added

- **`.prettierrc`** created: 4-space indent, single quotes, semicolons, trailing commas, 100-char print width
- **`eslint.config.js`** created: ESLint 10 flat config with `@typescript-eslint` recommended rules, `eslint-config-prettier` integration, and `no-unused-vars` configured to ignore `_`-prefixed identifiers (variables, args, and caught errors)
- **`package.json`**: `"lint": "eslint ."` and `"format": "prettier --write ."` scripts added; `eslint`, `typescript-eslint`, `eslint-config-prettier`, and `prettier` added as dev dependencies
- All existing source files re-formatted by Prettier

#### `server.ts` — updated

- Switched dotenv loading from an explicit `dotenv.config()` call to `import 'dotenv/config'`
- `app.listen` now binds to `0.0.0.0` (required for the server to be reachable from outside a Docker container)
- `PORT` env var cast to `Number` for `app.listen`

#### `src/db/connect.ts` — updated

`connectToDatabase()` now runs Drizzle `migrate()` automatically on startup, applying any pending migrations from `./drizzle` before the server starts accepting requests. The `drizzle/` folder is copied into the production Docker image to support this.

#### `AGENTS.md` — updated

Reflects all Phase 5 additions: ESLint/Prettier commands and config notes, health endpoint, updated docker-compose structure with the `app` service, and migrations-on-startup behaviour.

### Verification

- `npx tsc --noEmit` passes with zero errors under `NodeNext` module resolution.
- `npm test` (84 unit tests) continues to pass.
- `npm run lint` passes with zero errors on all source files.
- `npm run format` runs cleanly.
- Docker image builds successfully with the multi-stage Dockerfile.
- `docker compose up` starts the full stack (`db` → `app`) with health-check gating.

---

## File Change Summary

### Completed (Phases 1, 2, 3 & 4)

| File                                                | Status    | Notes                                                                                                                                                                      |
| --------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                      | Modified  | Mongoose/mongo-sanitize removed; drizzle-orm, postgres, drizzle-kit added; `dev` script added; `test`, `test:watch`, `test:coverage` scripts added; `vitest` dev dep added |
| `app.ts`                                            | Modified  | mongo-sanitize removed; `connectToDatabase` changed to named import                                                                                                        |
| `src/db/connect.ts`                                 | Rewritten | postgres.js + Drizzle; named exports `db` and `connectToDatabase`                                                                                                          |
| `src/db/schema.ts`                                  | Created   | Drizzle table definitions for `users` and `urls`                                                                                                                           |
| `drizzle.config.ts`                                 | Created   | Drizzle Kit config                                                                                                                                                         |
| `drizzle/0000_dark_toxin.sql`                       | Generated | Initial migration SQL                                                                                                                                                      |
| `src/types/user.ts`                                 | Created   | `UserSelect`, `UserPublic`, `UserInsert`, `UpdatedUser`                                                                                                                    |
| `src/types/url.ts`                                  | Created   | `UrlSelect`, `UrlInsert`                                                                                                                                                   |
| `src/types/auth.ts`                                 | Created   | `RequestUser` interface                                                                                                                                                    |
| `src/types/picodeclarations.d.ts`                   | Deleted   | Replaced by the three domain type files above                                                                                                                              |
| `src/models/user.ts`                                | Deleted   | Replaced by Drizzle schema                                                                                                                                                 |
| `src/models/url.ts`                                 | Deleted   | Replaced by Drizzle schema                                                                                                                                                 |
| `src/managers/usersManager.ts`                      | Rewritten | Drizzle queries; no document-helper functions                                                                                                                              |
| `src/managers/urlsManager.ts`                       | Rewritten | Drizzle queries; `sql` template for atomic visits increment                                                                                                                |
| `src/controllers/authController.ts`                 | Modified  | `password` → `hashedPassword`; `_id` → `id`                                                                                                                                |
| `src/controllers/usersController.ts`                | Modified  | `password` → `hashedPassword`; new type imports                                                                                                                            |
| `src/controllers/urlsController.ts`                 | Modified  | `shortUrl`/`originalUrl` → `short`/`original`; `_id` → `id`; new type imports                                                                                              |
| `src/helpers/validation.ts`                         | Modified  | Removed `picodeclarations` import; inline parameter types                                                                                                                  |
| `src/middleware/verifyJWT.ts`                       | Modified  | Import updated to `src/types/auth.js`                                                                                                                                      |
| `vitest.config.ts`                                  | Created   | Vitest config; node environment; `setupFiles` pointing at `src/test-setup.ts`                                                                                              |
| `src/test-setup.ts`                                 | Created   | Loads `.env.test` via dotenv before each test file                                                                                                                         |
| `.env.test`                                         | Created   | Safe placeholder env vars for unit tests; committed to repo                                                                                                                |
| `src/helpers/__tests__/validation.test.ts`          | Created   | 30 unit tests covering all 4 Joi schemas                                                                                                                                   |
| `src/middleware/__tests__/verifyJWT.test.ts`        | Created   | 5 unit tests for JWT middleware                                                                                                                                            |
| `src/controllers/__tests__/authController.test.ts`  | Created   | 6 unit tests for auth controller                                                                                                                                           |
| `src/controllers/__tests__/usersController.test.ts` | Created   | 16 unit tests for users controller                                                                                                                                         |
| `src/controllers/__tests__/urlsController.test.ts`  | Created   | 27 unit tests for URLs controller                                                                                                                                          |
| `AGENTS.md`                                         | Updated   | Tests section and build/run commands updated to reflect Vitest setup                                                                                                       |
| `README.md`                                         | Expanded  | Getting-started guide, API table, Docker instructions, Testing section added                                                                                               |
| `.env.example`                                      | Created   | Documents all required environment variables                                                                                                                               |
| `server.ts`                                         | Created   | New entry point (connects DB + listens); replaces root `app.ts` as entry                                                                                                   |
| `src/app.ts`                                        | Created   | Exported Express app (no listen); split from old root `app.ts`                                                                                                             |
| `docker-compose.yml`                                | Created   | `db` (dev, port 5432) and `db-test` (integration tests, port 5433) Postgres 17 services                                                                                    |
| `src/test-utils/db.ts`                              | Created   | `setupTestDb`, `teardownTestDb`, `truncateTables` helpers for integration tests                                                                                            |
| `vitest.integration.config.ts`                      | Created   | `fileParallelism: false`, 15s/30s timeouts, scoped to `tests/integration/`                                                                                                 |
| `vitest.config.ts`                                  | Updated   | Added `exclude: ['tests/integration/**', 'node_modules/**']`                                                                                                               |
| `tests/integration/auth.test.ts`                    | Created   | 6 integration tests — POST /api/auth                                                                                                                                       |
| `tests/integration/users.test.ts`                   | Created   | 16 integration tests — POST/GET/PATCH/DELETE /api/users                                                                                                                    |
| `tests/integration/urls.test.ts`                    | Created   | 23 integration tests — full URL lifecycle                                                                                                                                  |
| `package.json`                                      | Modified  | `main` → `server.js`; `start` → `node dist/server.js`; `dev` → `tsx watch server.ts`; `test:integration` script added; `supertest` + `@types/supertest` dev deps added     |
| `.env.test`                                         | Modified  | `DATABASE_URL` updated to point at `db-test` container (port 5433)                                                                                                         |
| `Dockerfile`                                        | Modified  | `CMD` updated to `node dist/server.js`                                                                                                                                     |

### Completed (Phase 5)

| File                 | Status   | Notes                                                                                                                                                     |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.json`      | Modified | `target` → `es2022`; `module`/`moduleResolution` → `NodeNext`; re-indented to 4 spaces                                                                    |
| `src/app.ts`         | Modified | `GET /health` endpoint added                                                                                                                              |
| `Dockerfile`         | Modified | `HEALTHCHECK` added; converted to multi-stage build (`builder` + `production`)                                                                            |
| `docker-compose.yml` | Modified | `app` service added; `db` healthcheck added; `app` given explicit `DATABASE_URL`; re-indented                                                             |
| `.prettierrc`        | Created  | Prettier config: 4-space indent, single quotes, semicolons, trailing commas, 100-char print width                                                         |
| `eslint.config.js`   | Created  | ESLint 10 flat config: `typescript-eslint` recommended, `eslint-config-prettier`, `_`-prefix ignores                                                      |
| `package.json`       | Modified | `lint` and `format` scripts added; `eslint`, `typescript-eslint`, `eslint-config-prettier`, `prettier` dev deps added; `build` script simplified to `tsc` |
| `server.ts`          | Modified | Switched to `import 'dotenv/config'`; `app.listen` binds to `0.0.0.0`; `PORT` cast to `Number`                                                            |
| `src/db/connect.ts`  | Modified | `connectToDatabase()` now runs `migrate()` on startup to apply pending Drizzle migrations                                                                 |
| `AGENTS.md`          | Updated  | Reflects Phase 5 additions: ESLint/Prettier, health endpoint, docker-compose app service, migrations on startup                                           |
