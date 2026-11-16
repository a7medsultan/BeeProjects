# BeeProjects

Phase 0 MVP foundation for a small-team project and task management system.

Built as a single full-stack **SvelteKit 3** application with **Svelte 5**, server-side
rendering, form actions, and **SQLite** via `better-sqlite3`. No separate API process.

The full implementation plan lives in
[`Documentation/phase-0-sveltekit-plan.md`](Documentation/phase-0-sveltekit-plan.md).

## Current status

**Milestone M0 — foundation.**

- SvelteKit 3 + adapter-node scaffold
- Tailwind 4 + shadcn-svelte-compatible setup (`components.json`, `cn` helper)
- SQLite schema, migration runner, and connection pragmas
- First-admin seeding with Argon2id password hashing
- Server-side session validation foundation
- Application shell (sidebar, dashboard, login shell, placeholder pages)
- `/health` endpoint and security headers

Next up: **M1 — authentication and user management.**

The login form is intentionally disabled until M1. The dashboard is an M0 preview and
does not expose real data.

## Requirements

- Node.js `>=22.17` (tested with 22.23)
- pnpm 9+
- SQLite is bundled through `better-sqlite3`; the `sqlite3` CLI is only needed for backups

## Quick start

```bash
pnpm install
cp .env.example .env   # if .env does not exist
pnpm db:seed           # applies migrations + creates the first admin
pnpm dev
```

Open <http://localhost:5173>. Health check: <http://localhost:5173/health>.

The default development admin from `.env.example` is:

- Email: `admin@example.com`
- Password: `change-me-please`

Change these before using the app with real data. `.env` is gitignored.

## Scripts

| Script            | Purpose                                                       |
| ----------------- | ------------------------------------------------------------- |
| `pnpm dev`        | Start the Vite/SvelteKit dev server                           |
| `pnpm build`      | Build the production server with adapter-node                 |
| `pnpm start`      | Run the production build with `.env`                          |
| `pnpm check`      | Run `svelte-check`                                            |
| `pnpm lint`       | Prettier check + ESLint                                       |
| `pnpm format`     | Format the codebase                                           |
| `pnpm test`       | Run Vitest (once test files exist)                            |
| `pnpm test:e2e`   | Run Playwright (once E2E tests exist)                         |
| `pnpm db:migrate` | Apply pending SQL migrations                                  |
| `pnpm db:seed`    | Apply migrations and create the first admin if no users exist |

## Database

- File: `data/app.db` (`DATABASE_PATH` overrides)
- Mode: WAL, `foreign_keys=ON`, `busy_timeout=5000`
- Migrations: `src/lib/server/db/migrations/*.sql`
- Applied migrations are tracked in `schema_migrations`
- Migrations run automatically on server start via the `init` hook
- `pnpm db:seed` is safe to run repeatedly; it only creates a user when the table is empty

The database file and attachments are gitignored and must be backed up in production.

## Production

```bash
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production node --env-file=.env build
```

Required/important environment variables:

- `ORIGIN` — public origin, e.g. `https://projects.example.com` (CSRF checks)
- `BODY_SIZE_LIMIT=12M` — adapter-node defaults to 512 KB
- `DATABASE_PATH` — SQLite file path
- `UPLOAD_DIR` — private attachment directory
- `SESSION_TTL_DAYS` — session lifetime (default 30)
- `JOBS_ENABLED` — set `false` in tests

If the app is behind a reverse proxy, also set:

```dotenv
PROTOCOL_HEADER=x-forwarded-proto
HOST_HEADER=x-forwarded-host
ADDRESS_HEADER=x-forwarded-for
XFF_DEPTH=1
```

Run a single app instance: SQLite and the in-process jobs assume one writer.

## Backups

Planned for M7 (`scripts/backup.sh`). Back up both `data/app.db` and `storage/attachments/`.
