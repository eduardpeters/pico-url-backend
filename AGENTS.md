# AGENTS.md — pico-url-backend

## Project Overview

URL shortener REST API built with Express + TypeScript, MongoDB (Mongoose), and JWT authentication.
ESM module system (`"type": "module"` in package.json).

## Build / Run Commands

```bash
# Build (compile TypeScript to ./dist)
npm run build          # runs: npx tsc

# Start (run compiled output)
npm run start          # runs: node dist/app.js

# Dev server with file watching (HMR)
npm run dev            # runs: tsx watch app.ts

# Type-check without emitting
npx tsc --noEmit
```

## Tests

**No test framework is configured.** The `npm test` script is a placeholder that exits with error.
If tests are added in the future, update this section with the framework and commands.

## Linting / Formatting

**No linting or formatting tools are configured** (no ESLint, Prettier, or EditorConfig).
Follow the existing code style conventions described below.

## Project Structure

```
app.ts                        # Entry point: Express setup, middleware, routes, server start
src/
├── controllers/              # Request handlers (business logic + HTTP responses)
│   ├── authController.ts     # Login/auth: JWT token generation
│   ├── urlsController.ts     # CRUD for shortened URLs
│   └── usersController.ts    # User registration, get, update, delete
├── db/
│   └── connect.ts            # Mongoose connection setup
├── helpers/
│   └── validation.ts         # Joi validation schemas
├── managers/                 # Data access layer (static class methods wrapping Mongoose)
│   ├── urlsManager.ts        # URL CRUD against MongoDB
│   └── usersManager.ts       # User CRUD against MongoDB
├── middleware/
│   └── verifyJWT.ts          # JWT verification middleware
├── models/                   # Mongoose schema/model definitions
│   ├── url.ts                # Url model
│   └── user.ts               # User model
├── routes/                   # Express Router definitions
│   ├── authRoute.ts
│   ├── urlsRoute.ts
│   └── usersRoute.ts
└── types/
    └── picodeclarations.d.ts # TypeScript interfaces
```

## Architecture

Layered MVC-like pattern: **Routes -> Controllers -> Managers -> Models**.

- **Routes** define Express endpoints and attach middleware.
- **Controllers** handle request/response, validation, and orchestration.
- **Managers** are static classes that wrap Mongoose queries (data access layer).
- **Models** define Mongoose schemas and export the model.

## Code Style Guidelines

### TypeScript & Module System

- **Strict mode** is enabled in tsconfig.json.
- **ESM imports** throughout. Local imports MUST use `.js` extension:
  ```ts
  import urlsManager from '../managers/urlsManager.js';
  ```
- Type imports from `.d.ts` files use extensionless paths:
  ```ts
  import { RequestUser } from '../types/picodeclarations';
  ```
- Target: `es2020`, Module: `ESNext`, Module resolution: `node`.

### Formatting

- **Indentation:** 4 spaces.
- **Quotes:** Single quotes for all strings.
- **Semicolons:** Always used at end of statements.
- **Trailing commas:** Used in object literals and function arguments.

### Naming Conventions

| Element           | Convention                  | Example                          |
|-------------------|-----------------------------|----------------------------------|
| Files             | camelCase                   | `urlsController.ts`              |
| Interfaces        | PascalCase + `Interface`    | `UserInterface`, `UrlInterface`  |
| Manager classes   | camelCase (project convention) | `class usersManager`          |
| Functions         | camelCase                   | `registerUser`, `getAllUrls`      |
| Constants         | SCREAMING_SNAKE_CASE        | `SHORTIDLENGTH`                  |
| Variables         | camelCase                   | `urlEntry`, `hashedPassword`     |
| Mongoose models   | PascalCase                  | `User`, `Url`                    |
| Router variables  | `router`                    | `const router = express.Router()`|

### Export Patterns

- **Controllers:** Default export of an object with named function properties:
  ```ts
  export default { registerUser, getUser, deleteUser, updateUser };
  ```
- **Managers:** Default export of the class:
  ```ts
  export default usersManager;
  ```
- **Models:** Default export of the Mongoose model:
  ```ts
  export default User;
  ```
- **Middleware:** Default export of the function.
- **Routes:** Default export of the router.
- **Helpers/Validation:** Named exports:
  ```ts
  export function validateUser(...) { ... }
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

- All custom interfaces live in `src/types/picodeclarations.d.ts`.
- JWT-authenticated request user is accessed via type assertion:
  ```ts
  (req as Request & RequestUser).user._id
  ```
- Environment variables are cast with `as string`:
  ```ts
  process.env.JWT_SECRET as string
  ```
- Joi is used for runtime request body validation alongside TypeScript types.
- Mongoose queries use `.lean()` for performance (returns plain objects).

## Environment Variables

Required (loaded via `dotenv`):

| Variable       | Description                                    |
|----------------|------------------------------------------------|
| `PORT`         | Server port (Dockerfile exposes 4242)          |
| `CORS_ORIGIN`  | Allowed CORS origin                            |
| `MONGODB_URI`  | MongoDB connection string                      |
| `JWT_SECRET`   | Secret key for JWT signing                     |
| `URL_BASE`     | Base URL for constructing short URLs           |

**Never commit `.env` files.** The `.gitignore` already excludes them.

## Dependencies

**Runtime:** express (v5), mongoose, cors, dotenv, bcrypt, jsonwebtoken, joi, nanoid (v5, ESM-only), express-mongo-sanitize.
**Dev:** typescript (v5), tsx (watch mode / HMR), @types/node, @types/express, @types/bcrypt, @types/cors, @types/jsonwebtoken.

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

Base image: `node:18`. Build runs `npm install` then `npm run build`. Entry: `node dist/app.js`.
