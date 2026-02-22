# pico-url-backend

A URL shortener REST API built with Express + TypeScript, PostgreSQL (Drizzle ORM), and JWT authentication.

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

| Variable       | Description                                      |
|----------------|--------------------------------------------------|
| `PORT`         | Port the server listens on                       |
| `CORS_ORIGIN`  | Allowed CORS origin (e.g. your frontend URL)     |
| `DATABASE_URL` | PostgreSQL connection string                     |
| `JWT_SECRET`   | Secret key used to sign and verify JWT tokens    |
| `URL_BASE`     | Base URL prepended to generated short codes      |

### 3. Run database migrations

```bash
npx drizzle-kit migrate
```

### 4. Start the server

```bash
# Development (with file watching)
npm run dev

# Production
npm run build
npm run start
```

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/` | No | Log in, receive JWT |
| `POST` | `/api/users/` | No | Register a new user |
| `GET` | `/api/users/` | Yes | Get current user |
| `PATCH` | `/api/users/` | Yes | Update current user |
| `DELETE` | `/api/users/` | Yes | Delete current user |
| `GET` | `/api/urls/` | Yes | List all URLs for current user |
| `POST` | `/api/urls/` | Yes | Shorten a URL |
| `GET` | `/api/urls/count` | Yes | Get URL count for current user |
| `GET` | `/api/urls/:shorturl` | No | Resolve short code to original URL |
| `GET` | `/api/urls/info/:shorturl` | Yes | Get full URL details |
| `PATCH` | `/api/urls/:shorturl` | Yes | Update original URL |
| `DELETE` | `/api/urls/:shorturl` | Yes | Delete a shortened URL |

Protected routes require an `Authorization: Bearer <token>` header.

## Docker

```bash
docker build -t pico-url-backend .
docker run -p 4242:4242 --env-file .env pico-url-backend
```
