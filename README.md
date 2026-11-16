# BeeProjects

Phase 0 MVP foundation for a small-team project and task management system.

Built as a single full-stack **SvelteKit 3** application with **Svelte 5**, server-side
rendering, form actions, and **SQLite** via `better-sqlite3`. No separate API process.

The full implementation plan lives in
[`Documentation/phase-0-sveltekit-plan.md`](Documentation/phase-0-sveltekit-plan.md).

## Current status

**Phase 0 complete — M7 hardening and acceptance.**

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
- Project and task activity history
- Task create/edit/delete with soft-delete and subtask cascade
- Multiple assignees with project-membership validation
- One-level subtasks with parent validation
- Task status, priority, dates, overdue indicators, and completion timestamps
- List view with search, status/priority/assignee/due filters, sorting, and pagination
- Kanban board with drag handles, cross-column status changes, and an accessible status menu fallback
- My Tasks across projects, grouped by status with completed toggle and deadline highlights
- Dashboard statistics, My Work, recently updated tasks, and project progress overview
- Task comments in chronological order with edits and soft deletes
- `@` mention autocomplete with project-member validation and highlighted mention chips
- Private task attachments with magic-byte validation, authenticated download, and delete controls
- Comment and attachment activity events in task and project timelines
- In-app notifications for assignments, reassignments, comments, mentions, due-soon tasks, and overdue tasks
- Notification bell with unread badge, recent dropdown, 30-second polling, and focus refresh
- Notifications page with unread filtering, mark read, mark all read, and click-through to the task
- Hourly deadline jobs with per-user timezone handling and dedupe keys
- Playwright end-to-end smoke test covering the full admin → project → task → member flow
- Production CSP, security headers, backup script, and documented restore procedure
- Task detail page with inline editing, subtasks, comments, attachments, and activity
- Member-assignee edit permissions with manager-only assignment control
- Application shell with role-aware navigation
- `/health` endpoint and security headers

Phase 0 is complete. Phase 1 has not been started; review
[`Documentation/specs.md`](Documentation/specs.md) before planning further scope.

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
- Progress is calculated from completed tasks, including subtasks.
- Project activity records creation, field changes, ownership changes, membership changes, archive state changes, and task events.

## Tasks

- Admins and project owners can create, edit, delete, and assign tasks. Members can update tasks assigned to them.
- Tasks support multiple assignees, priority, status, start/due dates, and one level of subtasks.
- Assignees must be active project members. Managers can reassign; member-assignees cannot change assignees.
- Marking a task Done sets `completed_at`; moving it out of Done clears it.
- Deleting a parent task soft-deletes its subtasks and still records the deletion in activity.
- The List view supports search, status/priority/assignee/due filters, sorting by due date/priority/creation, and pagination.
- Overdue tasks are highlighted in the List view and task detail.
- Task detail includes inline editing, subtasks, assignment controls, and a task activity timeline.
- Comments and attachments are placeholders until M5.

## Views and dashboard

- **Kanban:** five status columns showing top-level tasks. Managers can move any task; member-assignees can move their own. Drag handles support mouse, touch, and keyboard, with a per-card status menu as a fallback. Archived projects are read-only.
- **My Tasks:** assigned tasks across active projects, grouped by status, with a completed toggle. Overdue and due-soon tasks are highlighted; tasks in archived projects are hidden.
- **Dashboard:** viewer-scoped active-project, open/completed/overdue/due-today counts; My Work for assigned, overdue, and upcoming tasks; recently updated tasks; and a project progress overview.
- Dashboard deadlines use the viewer's timezone. Project and task data is scoped by Admin, project owner, or membership access.

## Collaboration

- **Comments:** shown chronologically. Authors can edit/delete their own comments; admins and project owners can edit/delete any comment. Archived projects are read-only.
- **Mentions:** typing `@` opens a member picker and inserts a stable token. The server validates every mentioned user as an active project member and rejects invalid mentions. Mentions render as highlighted chips.
- **Attachments:** any project member can upload; uploader, project owner, or admin can delete. Files are limited to 10 MB, checked against an extension/MIME/magic-byte allowlist, stored privately, and served only through an authenticated download route.
- **Limits:** keep `BODY_SIZE_LIMIT=12M` in production so the 10 MB per-file limit can be enforced by the app rather than the adapter.
- Comment and attachment changes are recorded in the task and project activity timelines.

## Notifications

- The bell polls unread count every 30 seconds and refreshes on window focus. The dropdown shows the five most recent notifications.
- The notifications page supports all/unread filters, per-item mark-read, mark-all-read, and click-through to the related task.
- Events: new assignment, reassignment/unassignment, new comment, mention, due-soon reminder, and overdue reminder.
- Comment notifications go to task assignees and the task creator. Mentioned users get only the mention notification.
- Deadline jobs run hourly. Due-soon reminders fire at the first tick after 08:00 in the assignee's timezone, one day before the due date. Overdue reminders fire once after the due date.
- Dedupe keys prevent repeated deadline notifications for the same task/user/due date.
- Self-notifications are skipped; deactivated users receive none.
- Jobs run in-process, so keep a single app instance.

## Testing

```bash
pnpm check      # svelte-check
pnpm lint       # Prettier + ESLint
pnpm test       # Vitest unit/service suites

pnpm exec playwright install chromium   # once per machine
pnpm test:e2e                           # fresh E2E DB + Playwright
```

- `pnpm test:e2e` resets `data/e2e.db` and `storage/e2e-attachments`, seeds
  `e2e-admin@example.com`, starts the app in test mode on port 4173, runs the
  Playwright smoke flow, and leaves artifacts under `test-results/`.
- `.env.test` contains only local test credentials.
- The E2E flow covers admin login, project creation, member creation and
  assignment, task creation, comments, attachment upload/download, forced
  password change, My Tasks, notifications, Kanban status fallback, and
  member permission denials.
- CI should run `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`, then
  `pnpm test:e2e`.

## Scripts

| Script             | Purpose                                                       |
| ------------------ | ------------------------------------------------------------- |
| `pnpm dev`         | Start the Vite/SvelteKit dev server                           |
| `pnpm build`       | Build the production server with adapter-node                 |
| `pnpm start`       | Run the production build with `.env`                          |
| `pnpm check`       | Run `svelte-check`                                            |
| `pnpm lint`        | Prettier check + ESLint                                       |
| `pnpm format`      | Format the codebase                                           |
| `pnpm test`        | Run Vitest unit and service tests                             |
| `pnpm test:e2e`    | Prepare the E2E database and run Playwright                   |
| `pnpm test:e2e:ui` | Run Playwright in UI mode                                     |
| `pnpm db:migrate`  | Apply pending SQL migrations                                  |
| `pnpm db:seed`     | Apply migrations and create the first admin if no users exist |

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

Production builds enable a SvelteKit CSP with self-only scripts, nonces/hashes,
and `frame-ancestors 'none'`. `X-Frame-Options`, `nosniff`, and a strict
referrer policy are also set by the app.

Example systemd unit:

```ini
[Unit]
Description=BeeProjects
After=network.target

[Service]
Type=simple
User=beeprojects
WorkingDirectory=/srv/beeprojects
EnvironmentFile=/srv/beeprojects/.env
ExecStart=/usr/bin/node build
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Put Caddy or nginx in front for TLS and compression.

## Backups

Run:

```bash
./scripts/backup.sh
```

The script reads `DATABASE_PATH` and `UPLOAD_DIR` from the environment or `.env`,
writes a consistent SQLite `.backup` and a tarball of the uploads directory to
`./backups` (override with `BACKUP_DIR`), and deletes backup files older than 14
days (`RETENTION_DAYS` override).

Example daily cron:

```cron
15 2 * * * cd /srv/beeprojects && ./scripts/backup.sh >> /var/log/beeprojects-backup.log 2>&1
```

Restore procedure:

1. Stop the app.
2. Back up the current database first.
3. Copy the chosen `backups/app-*.db` to `data/app.db`.
4. Remove `data/app.db-wal` and `data/app.db-shm`.
5. Extract the matching uploads archive into the parent of `UPLOAD_DIR`
   (`tar -xzf backups/uploads-*.tar.gz -C storage` for the default path).
6. Start the app and verify `/health` plus a login.
7. Keep the pre-restore database until the restored instance is verified.

Back up both the database and uploads. A database-only backup loses attachments.
