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

## Phase 3: Add Vitest & Unit Tests — NOT STARTED

### 3.1 Install Vitest

```bash
npm install -D vitest
```

### 3.2 Add test scripts to package.json

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### 3.3 Configure Vitest

Create `vitest.config.ts` at project root. Configure for ESM + TypeScript.

### 3.4 Write unit tests with mocked DB layer

Mock the manager layer so tests don't need a real database.

| Test File | Coverage |
|---|---|
| `src/controllers/__tests__/authController.test.ts` | Login flow, JWT generation, invalid credentials, missing fields |
| `src/controllers/__tests__/usersController.test.ts` | Registration, get/update/delete user, duplicate email, validation |
| `src/controllers/__tests__/urlsController.test.ts` | URL CRUD, ownership checks, visit counting, nanoid generation |
| `src/helpers/__tests__/validation.test.ts` | All 4 Joi schemas — valid/invalid inputs, edge cases |
| `src/middleware/__tests__/verifyJWT.test.ts` | Token extraction, valid/invalid/missing tokens |

### 3.5 Running tests

```bash
# Run all tests once
npx vitest run

# Run a single test file
npx vitest run src/helpers/__tests__/validation.test.ts

# Run tests matching a pattern
npx vitest run -t "should reject invalid email"
```

---

## Phase 4: Integration Tests — NOT STARTED

### 4.1 Test database setup

Either:
- **Docker Compose** with a Postgres service for testing, OR
- **testcontainers** for ephemeral containers per test run

Create test helpers for:
- Running Drizzle migrations against test DB
- Seeding test data
- Cleanup between tests (truncate tables)

### 4.2 Write integration tests

| Test File | Coverage |
|---|---|
| `tests/integration/auth.test.ts` | Full login flow against real Postgres |
| `tests/integration/urls.test.ts` | Full URL lifecycle: create, read, update, delete, visit increment |
| `tests/integration/users.test.ts` | Full user lifecycle, including cascade delete verification |

### 4.3 Separate config

Create `vitest.integration.config.ts` with longer timeouts and test DB setup.

```json
"test:integration": "vitest run --config vitest.integration.config.ts"
```

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

### Completed (Phases 1 & 2)

| File | Status | Notes |
|---|---|---|
| `package.json` | Modified | Mongoose/mongo-sanitize removed; drizzle-orm, postgres, drizzle-kit added; `dev` script added |
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
| `AGENTS.md` | Updated | Reflects full new stack |
| `README.md` | Expanded | Getting-started guide, API table, Docker instructions |
| `.env.example` | Created | Documents all required environment variables |

### Pending (Phases 3–5)

| File | Action | Phase |
|---|---|---|
| `vitest.config.ts` | Create | 3 |
| `src/controllers/__tests__/*.test.ts` | Create | 3 |
| `src/helpers/__tests__/validation.test.ts` | Create | 3 |
| `src/middleware/__tests__/verifyJWT.test.ts` | Create | 3 |
| `vitest.integration.config.ts` | Create | 4 |
| `tests/integration/*.test.ts` | Create | 4 |
| `docker-compose.yml` | Create | 5 |
| `package.json` | Modify — add test scripts | 3 |
| `tsconfig.json` | Modify — bump target/module/moduleResolution | 5 |
| `Dockerfile` | Modify — add health check | 5 |
| `AGENTS.md` | Modify — add test commands once Phase 3 is done | 3 |
