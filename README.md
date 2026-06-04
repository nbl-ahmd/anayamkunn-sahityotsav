# Anayamkunnu Sector Sahityotsav App

Standalone Next.js app for Anayamkunnu Sector Sahityotsav.

- Admin dashboard for result publishing
- Result poster template and sponsor ad management
- Admin-managed unit names for result-entry dropdowns
- Public result poster browser and downloads
- Event date settings for the public homepage

## Production Persistence

This app supports production-grade persistence:

- **Vercel Blob** for uploaded poster assets
- **Neon Postgres** for result templates, published results, sponsor ads, unit names, and app settings

If `DATABASE_URL` is not set, the app falls back to local `data/store.json` storage for development.

## Run Locally

```bash
cd anayamkunn-sahityotsav-app
npm install
npm run dev
```

Open `http://localhost:3000`.

Results route: `/results`

## Environment Variables

Copy `.env.example` to `.env.local` and set real values:

```bash
cp .env.example .env.local

DATABASE_URL=postgres://USER:PASSWORD@HOST/DB_NAME?sslmode=require
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_with_strong_password
ADMIN_AUTH_SECRET=replace_with_long_random_secret
```

## Admin Access

- Access admin manually by opening `/admin`.
- Unauthenticated requests are redirected to `/admin/login`.
- Login is protected with an `httpOnly` signed session cookie.

## Neon Setup

1. Create a new Neon project/branch/database from Neon Console.
2. Copy the connection string and set it as `DATABASE_URL`.
3. Run SQL from `database/schema.sql` in Neon SQL Editor.

The app also auto-creates tables on first DB access, but running `database/schema.sql` is recommended for explicit production setup.

## Blob Upload Flow

Admin poster uploads store files in Vercel Blob. Returned Blob URLs are saved in result template and poster records in Postgres.

Upload safeguards:

- Max 20 files per request
- Max 10MB per file
- Allowed formats: PNG, JPG/JPEG, WEBP

## Health Check Endpoint

Use `GET /api/health` for uptime/infra checks.

It reports:

- App status (`ok` or `degraded`)
- DB mode (`postgres` or `file` fallback)
- DB connectivity result
- Blob token availability
- Response time

## Deploy As Separate App

Deploy `anayamkunn-sahityotsav-app` as its own project.
