# BeeProjects

Phase 0 MVP foundation for a small-team project and task management system.

Built as a single full-stack **SvelteKit 3** application with **Svelte 5**, server-side
rendering, form actions, and **SQLite** via `better-sqlite3`. No separate API process.

The full implementation plan lives in
[`Documentation/phase-0-sveltekit-plan.md`](Documentation/phase-0-sveltekit-plan.md).

## Current status

**Milestone M2 — projects, membership, archive, and activity.**

- SvelteKit 3 + adapter-node scaffold
- Tailwind 4 + shadcn-svelte-compatible setup (`components.json`, `cn` helper)
- SQLite schema, migration runner, and connection pragmas
- Server-side sessions, HttpOnly cookies, login/logout, and login rate limiting
- Argon2id passwords, self-service password change, and admin password resets
- Admin user management: create, edit, deactivate/reactivate, reset password
- Forced password change for temporary passwords
- Role guards, last-admin protection, and project-ownership deactivation guard
- Project create/edit/archive/unarchive with owner, dates, priority, and status
- Project membership add/remove with owner and open-task guards
- Admin-only owner reassignment
- Project filters (search, status, owner) and pagination
- Automatic project progress from task completion
- Project activity timeline and audit history
- Application shell with role-aware navigation
- `/health` endpoint and security headers

Next up: **M3 — task management, assignments, subtasks, and the List view.**

The dashboard remains a preview until aggregation arrives in M4.

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

Use the URL printed by Vite (default <http://localhost:5173>). Health check: `/health`.

The default development admin from `.env.example` is:

- Email: `admin@example.com`
- Password: `change-me-please`

Change these before using the app with real data. `.env` is gitignored.

## Authentication

- Login is session-based; the `sid` cookie is HttpOnly, SameSite=Lax, and Secure in production.
- Failed logins are rate-limited in memory (10 attempts / 15 minutes per IP and IP+email).
- Admin-created users receive a one-time temporary password and must change it at first sign-in.
- Password changes and admin resets revoke the user's other sessions.
- Deactivated users cannot sign in; reactivating restores access.
- There is no self-registration or email-based password reset in Phase 0.

## Projects

- Admins and project managers can create projects; project managers own the projects they create.
- Admins can assign an owner at creation and transfer ownership later. The new owner is added as a member; the previous owner stays a member.
- Owners and admins can edit, archive/unarchive, and manage members. Members have read-only project access.
- Archived projects are read-only until unarchived.
- A project owner cannot be removed. Members with open assigned tasks must be reassigned first.
- Progress is calculated from completed tasks once task management lands in M3.
- Project activity records creation, field changes, ownership changes, membership changes, and archive state changes.

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
