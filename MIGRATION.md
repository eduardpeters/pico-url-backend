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
| `@types/node` | ^22.0.0 | Upgraded from v18 |
| `typescript` | ^5.9.3 | Upgraded from v4 |
| `tsx` | ^4.21.0 | **New** — dev dependency |
| `mongoose` | ^6.9.1 | Unchanged — removed in Phase 2 |
| `express-mongo-sanitize` | ^2.2.0 | Unchanged — removed in Phase 2 |

### Code Changes Made

1. **`package.json`** — Bumped all versions, added `tsx` dev dep, added `"dev": "tsx watch app.ts"` script.
2. **`app.ts:29`** — Updated `app.listen` callback to accept Express 5's optional error argument.
3. **`src/controllers/urlsController.ts:21,52,100,123`** — Added `as string` casts to `req.params.shorturl` (Express 5 types params as `string | string[]`).
4. **`AGENTS.md`** — Added `npm run dev` command, Express 5 notes, updated dependency versions.

### Verification

- `npx tsc --noEmit` passes with zero errors.
- `npm run build` compiles cleanly to `dist/`.
- `tsx app.ts` starts successfully (fails at MongoDB connection as expected without `.env`).
- `tsx watch app.ts` watch mode works correctly.

---

## Phase 2: MongoDB to Postgres Migration — NOT STARTED

This is the largest phase. Replace Mongoose with Drizzle ORM + Postgres.

### 2.1 Install new dependencies

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### 2.2 Remove MongoDB dependencies

```bash
npm uninstall mongoose express-mongo-sanitize
```

Remove `ExpressMongoSanitize` import and `app.use(ExpressMongoSanitize())` from `app.ts`.

### 2.3 Create Drizzle schema

Create `src/db/schema.ts` with two tables:

**`users` table:**
```
id            uuid         PRIMARY KEY, defaultRandom()
name          varchar(50)  NOT NULL
email         varchar(255) NOT NULL, UNIQUE
password      varchar(1024) NOT NULL
createdAt     timestamp    DEFAULT now()
```

**`urls` table:**
```
id            uuid         PRIMARY KEY, defaultRandom()
userId        uuid         NOT NULL, REFERENCES users(id) ON DELETE CASCADE
originalUrl   text         NOT NULL, UNIQUE
shortUrl      varchar(10)  NOT NULL, UNIQUE
visits        integer      NOT NULL, DEFAULT 0
createdAt     timestamp    DEFAULT now()
```

### 2.4 Replace DB connection

Rewrite `src/db/connect.ts`:
- Replace `mongoose.connect()` with postgres.js pool + Drizzle instance
- Export the `db` object for use by managers
- Rename env var `MONGODB_URI` -> `DATABASE_URL`

### 2.5 Rewrite managers

Both managers need complete rewrites from Mongoose to Drizzle queries.

**`src/managers/urlsManager.ts`** — Mongoose to Drizzle mapping:

| Current Method | Mongoose API | Drizzle Equivalent |
|---|---|---|
| `getAllByUser(userId)` | `Url.find({ userId })` | `db.select().from(urls).where(eq(urls.userId, userId))` |
| `getByShortUrl(shortUrl)` | `Url.findOne({ shortUrl }).lean()` | `db.select().from(urls).where(eq(urls.shortUrl, shortUrl))` then `[0]` |
| `getByOriginalUrl(originalUrl)` | `Url.findOne({ originalUrl }).lean()` | `db.select().from(urls).where(eq(urls.originalUrl, originalUrl))` then `[0]` |
| `getByShortUrlAndIncreaseVisits(shortUrl)` | `Url.findOneAndUpdate({ shortUrl }, { $inc: { visits: amount } }).lean()` | `db.update(urls).set({ visits: sql\`${urls.visits} + ${amount}\` }).where(eq(urls.shortUrl, shortUrl)).returning()` |
| `getCount(userId)` | `Url.countDocuments({ userId })` | `db.select({ count: count() }).from(urls).where(eq(urls.userId, userId))` |
| `createUrl(newUrl)` | `new Url(newUrl).save()` | `db.insert(urls).values(newUrl).returning()` |
| `updateUrl(id, newUrl)` | `Url.findByIdAndUpdate(id, { originalUrl: newUrl }, { returnDocument: "after" }).lean()` | `db.update(urls).set({ originalUrl: newUrl }).where(eq(urls.id, id)).returning()` |
| `deleteByShortUrl(shortUrl)` | `Url.findOneAndDelete({ shortUrl })` | `db.delete(urls).where(eq(urls.shortUrl, shortUrl))` |

**`src/managers/usersManager.ts`** — Same pattern. All `User.findOne`, `User.findById`, `User.findByIdAndUpdate`, `User.deleteOne`, `new User().save()` become Drizzle equivalents.

**Delete helper functions:** `urlDocumentToObject`, `userDocumentToObject`, `userDocumentToPasswordlessObject` — no longer needed since UUIDs are natively strings.

### 2.6 Update types

Rewrite `src/types/picodeclarations.d.ts`:
- Remove `import mongoose` and all `mongoose.Types.ObjectId` references
- Use `string` for all IDs (UUIDs are native strings)
- Consider deriving types from Drizzle schema: `typeof users.$inferSelect`

### 2.7 Delete Mongoose models

Remove `src/models/url.ts` and `src/models/user.ts` — replaced by Drizzle schema.

### 2.8 Update controllers

Minimal changes needed since UUIDs are strings (like the current `.toString()`-ed ObjectIds):
- Remove any `.toString()` calls on IDs
- Ownership checks (`urlEntry.userId !== user._id`) stay the same (string === string)

### 2.9 Update app.ts

- Remove `import ExpressMongoSanitize from 'express-mongo-sanitize'`
- Remove `app.use(ExpressMongoSanitize())`
- Update DB connection call if the function signature changes

### 2.10 Set up Drizzle config and migrations

- Create `drizzle.config.ts` at project root
- Run `npx drizzle-kit generate` to create initial migration
- Document migration command in AGENTS.md

### 2.11 Rename environment variable

`MONGODB_URI` -> `DATABASE_URL` (standard Postgres convention). Update in:
- `src/db/connect.ts`
- `AGENTS.md` env var table
- Any `.env.example` if one exists

### Key Risks for Phase 2

1. **`$inc` atomic increment** — The `getByShortUrlAndIncreaseVisits` method currently returns the **pre-update** document (no `returnDocument: "after"`). The controller only uses `originalUrl` which isn't changed, so using `.returning()` (post-update) is fine.
2. **No cascade delete exists currently** — `usersController.deleteUser` does NOT cascade-delete URLs. Adding `ON DELETE CASCADE` to the FK will automatically handle this.
3. **Manager architecture shift** — Managers currently import Mongoose models. They'll instead import the `db` instance + Drizzle table definitions.
4. **`express-mongo-sanitize` removal** — This middleware prevents MongoDB NoSQL injection. SQL injection is handled by Drizzle's parameterized queries. Safe to remove.

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

### 3.5 Running a single test

```bash
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

### 5.2 Update AGENTS.md

Reflect new stack (Drizzle/Postgres), all commands, test instructions, updated architecture.

### 5.3 Update Dockerfile

- Update base image (currently `node:18`)
- Remove any Mongo-specific configuration
- Add health check endpoint if desired

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

## File Change Summary (All Phases)

### Files to Create
- `src/db/schema.ts` — Drizzle table definitions (Phase 2)
- `drizzle.config.ts` — Drizzle Kit config (Phase 2)
- `vitest.config.ts` — Vitest config (Phase 3)
- `vitest.integration.config.ts` — Integration test config (Phase 4)
- `docker-compose.yml` — Local dev setup (Phase 5)
- `src/controllers/__tests__/*.test.ts` — Unit tests (Phase 3)
- `src/helpers/__tests__/*.test.ts` — Validation tests (Phase 3)
- `src/middleware/__tests__/*.test.ts` — Middleware tests (Phase 3)
- `tests/integration/*.test.ts` — Integration tests (Phase 4)

### Files to Rewrite
- `src/db/connect.ts` — Mongoose -> Drizzle/postgres.js (Phase 2)
- `src/managers/urlsManager.ts` — Mongoose queries -> Drizzle queries (Phase 2)
- `src/managers/usersManager.ts` — Mongoose queries -> Drizzle queries (Phase 2)
- `src/types/picodeclarations.d.ts` — Remove mongoose types, use Drizzle inferred types (Phase 2)

### Files to Delete
- `src/models/url.ts` — Replaced by Drizzle schema (Phase 2)
- `src/models/user.ts` — Replaced by Drizzle schema (Phase 2)

### Files to Modify
- `package.json` — Remove mongoose/mongo-sanitize deps, add drizzle/vitest deps, update scripts (Phase 2-4)
- `app.ts` — Remove mongo-sanitize middleware, update DB connection import (Phase 2)
- `tsconfig.json` — Update target/module/moduleResolution (Phase 5)
- `Dockerfile` — Update base image, remove Mongo refs (Phase 5)
- `AGENTS.md` — Reflect new stack throughout (Phase 5)

### Files Unchanged (after Phase 2)
- `src/controllers/authController.ts` — No Mongoose-specific code
- `src/controllers/usersController.ts` — Minimal changes (remove `.toString()` if any)
- `src/controllers/urlsController.ts` — Minimal changes
- `src/helpers/validation.ts` — No DB dependency
- `src/middleware/verifyJWT.ts` — No DB dependency
- `src/routes/*.ts` — No DB dependency
