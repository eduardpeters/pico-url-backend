# Migration Plan: pico-url-backend Modernization

## Decisions Made

| Decision | Choice |
|---|---|
| ORM | Drizzle ORM |
| DB Driver | postgres.js (`postgres` npm package) |
| Primary Keys | UUID with `defaultRandom()` |
| Cascade | `ON DELETE CASCADE` for user -> urls FK |
| Test Framework | Vitest |
| Test Strategy | Unit tests (mocked DB) + Integration tests (real Postgres) |
| Dev Server / HMR | `tsx watch` |
| Dependency Updates | All bumped to latest, including major versions |

---

## Phase 1: Update Dependencies & Dev Tooling — COMPLETED

All dependencies bumped to latest. `tsx` added for HMR dev server.

### Dependency Versions (current)

| Package | Version | Notes |
|---|---|---|
| `express` | ^5.2.1 | Upgraded from v4 |
| `@types/express` | ^5.0.6 | Matches Express 5 |
| `bcrypt` | ^6.0.0 | Upgraded from v5 |
| `@types/bcrypt` | ^6.0.0 | Matches bcrypt 6 |
| `cors` | ^2.8.6 | Patch bump |
| `@types/cors` | ^2.8.19 | Patch bump |
| `dotenv` | ^17.3.1 | Upgraded from v16 |
| `joi` | ^18.0.2 | Upgraded from v17 |
| `jsonwebtoken` | ^9.0.3 | Patch bump |
| `@types/jsonwebtoken` | ^9.0.10 | Patch bump |
| `nanoid` | ^5.1.6 | Upgraded from v4 |
| `@types/node` | ^24.0.0 | Upgraded from v18 |
| `typescript` | ^5.9.3 | Upgraded from v4 |
| `tsx` | ^4.21.0 | **New** — dev dependency |
| `drizzle-orm` | ^0.45.1 | **New** — added in Phase 2 |
| `postgres` | ^3.4.8 | **New** — added in Phase 2 |
| `drizzle-kit` | ^0.31.9 | **New** — dev dependency, added in Phase 2 |

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

All Mongoose queries replaced with Drizzle. Atomic visits increment uses `sql\`${urls.visits} + ${amount}\`` template. `getCount` returns a plain `number` (extracted from Drizzle's `count()` result).

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

| Test File | Tests | Coverage |
|---|---|---|
| `src/helpers/__tests__/validation.test.ts` | 30 | All 4 Joi schemas — valid/invalid inputs, boundary values, edge cases |
| `src/middleware/__tests__/verifyJWT.test.ts` | 5 | Missing token, no Bearer value, valid token → `next()` + `req.user` set, invalid token, expired token |
| `src/controllers/__tests__/authController.test.ts` | 6 | Validation failure, user not found, wrong password, successful login (JWT signed + user info returned), DB error |
| `src/controllers/__tests__/usersController.test.ts` | 16 | Register (success, duplicate email, validation error, DB errors), getUser (found, not found, DB error), deleteUser (success, DB error), updateUser (partial fields, password hashed, not found, DB error) |
| `src/controllers/__tests__/urlsController.test.ts` | 27 | getAllUrls, getUrl (ownership check), getUrlCount, getOriginalUrl (visit increment), createUrl (idempotent existing URL, new URL, nanoid called), updateUrl (ownership check), deleteUrl (ownership check, idempotent) |

#### `AGENTS.md` — updated

- Tests section replaced: now accurately describes Vitest, test file locations, and `.env.test` setup.
- Build/Run Commands section updated: `npm test`, `test:watch`, `test:coverage` added.

#### `README.md` — updated

Testing section added documenting the three test commands and the `.env.test` approach.

### Verification

- `npm test` passes: **5 test files, 84 tests, 0 failures**.
- `npx tsc --noEmit` continues to pass with zero errors.

---

## Phase 4: Integration Tests — NOT STARTED

**Decision made:** Docker Compose will be used to provide the test database. The `docker-compose.yml` created here will be extended in Phase 5 to also include the app service for local development (see Phase 5.4), so the two phases share one file.

### 4.1 Create `docker-compose.yml`

Add a `db-test` Postgres service on a separate port (e.g. `5433`) to avoid collisions with a local dev database on the default `5432`:

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: picodb
      POSTGRES_USER: pico
      POSTGRES_PASSWORD: pico
    ports:
      - "5432:5432"

  db-test:
    image: postgres:17
    environment:
      POSTGRES_DB: picodb_test
      POSTGRES_USER: pico
      POSTGRES_PASSWORD: pico
    ports:
      - "5433:5432"
```

The `app` service (for Phase 5 local dev) will be added to this file in Phase 5.4.

### 4.2 Add `.env.test` integration overrides

`.env.test` already exists from Phase 3 with a placeholder `DATABASE_URL`. Update it to point at the `db-test` service:

```
DATABASE_URL=postgres://pico:pico@localhost:5433/picodb_test
```

All other values in `.env.test` remain as-is.

### 4.3 Create test DB helper utilities

Create `src/test-utils/db.ts` with helpers used in `beforeAll`/`afterEach`/`afterAll` hooks:

- **`setupTestDb()`** — connects to the test DB and runs all Drizzle migrations (`drizzle-kit migrate` equivalent, or programmatic migration via Drizzle's `migrate()` helper)
- **`teardownTestDb()`** — closes the connection
- **`truncateTables()`** — truncates `urls` and `users` between tests to ensure isolation (using `TRUNCATE users CASCADE` which cascades to `urls`)

### 4.4 Create `vitest.integration.config.ts`

Separate config with longer timeouts and scoped to the integration test directory:

```ts
export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./src/test-setup.ts'],
        include: ['tests/integration/**/*.test.ts'],
        testTimeout: 15000,
        hookTimeout: 30000,
    },
});
```

### 4.5 Write integration tests

Create `tests/integration/` directory with three test files. These hit the real managers and database — no mocking.

| Test File | Coverage |
|---|---|
| `tests/integration/auth.test.ts` | Register a user then log in; wrong password returns 400; non-existent user returns 400 |
| `tests/integration/users.test.ts` | Full user lifecycle: create, get, update (name/email/password), delete; cascade delete removes associated URLs |
| `tests/integration/urls.test.ts` | Full URL lifecycle: create (201), create same URL again (200/idempotent), get, getCount, update original, visit increment, delete (204/idempotent) |

Each file follows this structure:

```ts
beforeAll(async () => { await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
afterEach(async () => { await truncateTables(); });
```

Integration tests call manager methods directly (not HTTP) — HTTP-layer integration (supertest) is out of scope for Phase 4.

### 4.6 Add `test:integration` script to `package.json`

```json
"test:integration": "vitest run --config vitest.integration.config.ts"
```

### Running integration tests

```bash
# Start the test database
docker compose up db-test -d

# Run integration tests
npm run test:integration

# Stop the test database
docker compose down
```

### Verification

- All integration tests pass against a live `db-test` Postgres container.
- `npm test` (unit tests) continues to pass independently with no database required.

---

## Phase 5: Final Cleanup & DX Polish — NOT STARTED

### 5.1 Update tsconfig.json

- Bump `target` to `es2022`
- Switch `module` and `moduleResolution` to `NodeNext` (modern Node ESM best practice)

### 5.2 Update AGENTS.md — ALREADY DONE in Phase 2

AGENTS.md was fully updated during Phase 2 to reflect the Drizzle/Postgres stack, new env vars, migration commands, and updated architecture. Only needs touching again if Phase 3–5 introduce new commands or conventions.

### 5.3 Update Dockerfile

The base image is already `node:24`. Remaining tasks:
- Add a health check endpoint (e.g. `GET /health`) to the Express app
- Add a `HEALTHCHECK` instruction to the Dockerfile if desired

### 5.4 Add docker-compose.yml

For local development with Postgres:

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: picodb
      POSTGRES_USER: pico
      POSTGRES_PASSWORD: pico
    ports:
      - "5432:5432"
  app:
    build: .
    ports:
      - "4242:4242"
    depends_on:
      - db
    env_file:
      - .env
```

### 5.5 Consider adding ESLint + Prettier

Optional but recommended for DX. Would add:
- `eslint` + `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`
- `prettier` + `eslint-config-prettier`
- npm scripts: `"lint": "eslint ."`, `"format": "prettier --write ."`

---

## File Change Summary

### Completed (Phases 1, 2 & 3)

| File | Status | Notes |
|---|---|---|
| `package.json` | Modified | Mongoose/mongo-sanitize removed; drizzle-orm, postgres, drizzle-kit added; `dev` script added; `test`, `test:watch`, `test:coverage` scripts added; `vitest` dev dep added |
| `app.ts` | Modified | mongo-sanitize removed; `connectToDatabase` changed to named import |
| `src/db/connect.ts` | Rewritten | postgres.js + Drizzle; named exports `db` and `connectToDatabase` |
| `src/db/schema.ts` | Created | Drizzle table definitions for `users` and `urls` |
| `drizzle.config.ts` | Created | Drizzle Kit config |
| `drizzle/0000_dark_toxin.sql` | Generated | Initial migration SQL |
| `src/types/user.ts` | Created | `UserSelect`, `UserPublic`, `UserInsert`, `UpdatedUser` |
| `src/types/url.ts` | Created | `UrlSelect`, `UrlInsert` |
| `src/types/auth.ts` | Created | `RequestUser` interface |
| `src/types/picodeclarations.d.ts` | Deleted | Replaced by the three domain type files above |
| `src/models/user.ts` | Deleted | Replaced by Drizzle schema |
| `src/models/url.ts` | Deleted | Replaced by Drizzle schema |
| `src/managers/usersManager.ts` | Rewritten | Drizzle queries; no document-helper functions |
| `src/managers/urlsManager.ts` | Rewritten | Drizzle queries; `sql` template for atomic visits increment |
| `src/controllers/authController.ts` | Modified | `password` → `hashedPassword`; `_id` → `id` |
| `src/controllers/usersController.ts` | Modified | `password` → `hashedPassword`; new type imports |
| `src/controllers/urlsController.ts` | Modified | `shortUrl`/`originalUrl` → `short`/`original`; `_id` → `id`; new type imports |
| `src/helpers/validation.ts` | Modified | Removed `picodeclarations` import; inline parameter types |
| `src/middleware/verifyJWT.ts` | Modified | Import updated to `src/types/auth.js` |
| `vitest.config.ts` | Created | Vitest config; node environment; `setupFiles` pointing at `src/test-setup.ts` |
| `src/test-setup.ts` | Created | Loads `.env.test` via dotenv before each test file |
| `.env.test` | Created | Safe placeholder env vars for unit tests; committed to repo |
| `src/helpers/__tests__/validation.test.ts` | Created | 30 unit tests covering all 4 Joi schemas |
| `src/middleware/__tests__/verifyJWT.test.ts` | Created | 5 unit tests for JWT middleware |
| `src/controllers/__tests__/authController.test.ts` | Created | 6 unit tests for auth controller |
| `src/controllers/__tests__/usersController.test.ts` | Created | 16 unit tests for users controller |
| `src/controllers/__tests__/urlsController.test.ts` | Created | 27 unit tests for URLs controller |
| `AGENTS.md` | Updated | Tests section and build/run commands updated to reflect Vitest setup |
| `README.md` | Expanded | Getting-started guide, API table, Docker instructions, Testing section added |
| `.env.example` | Created | Documents all required environment variables |

### Pending (Phases 4–5)

| File | Action | Phase |
|---|---|---|
| `docker-compose.yml` | Create — `db` (dev) and `db-test` (integration tests) services | 4 |
| `src/test-utils/db.ts` | Create — `setupTestDb`, `teardownTestDb`, `truncateTables` helpers | 4 |
| `vitest.integration.config.ts` | Create — longer timeouts, scoped to `tests/integration/` | 4 |
| `tests/integration/auth.test.ts` | Create | 4 |
| `tests/integration/users.test.ts` | Create | 4 |
| `tests/integration/urls.test.ts` | Create | 4 |
| `package.json` | Modify — add `test:integration` script | 4 |
| `.env.test` | Modify — update `DATABASE_URL` to point at `db-test` container | 4 |
| `tsconfig.json` | Modify — bump `target` to `es2022`; switch `module`/`moduleResolution` to `NodeNext` | 5 |
| `docker-compose.yml` | Modify — add `app` service for local dev (extends Phase 4 file) | 5 |
| `Dockerfile` | Modify — add health check | 5 |
| `AGENTS.md` | Modify — add `test:integration` command and integration test notes | 4 |
