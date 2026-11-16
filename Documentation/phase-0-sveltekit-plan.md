# BeeProjects — Phase 0 Implementation Plan (Full-Stack SvelteKit)

- **Source spec:** `Documentation/specs.md`
- **Status:** In implementation — M6 complete
- **Architecture:** One full-stack SvelteKit 3 app, SSR, Node adapter, SQLite
- **Target:** All Phase 0 completion criteria (spec §7), no out-of-scope features
- **Progress:** M0 delivered (scaffold, schema, migrations, shell, `/health`). M1 delivered (sessions, login/logout, rate limiting, password change/reset, admin user management, role guards, forced temp-password change). M2 delivered (projects, owner transfer, membership guards, archive/unarchive, filters/pagination, progress calculation, activity timeline). M3 delivered (tasks, multiple assignees, subtasks, soft delete, task activity, List view, task detail, overdue handling). M4 delivered (Kanban board, My Tasks, dashboard statistics, My Work, recent updates, project overview). M5 delivered (comments, mentions, attachments, private downloads, collaboration activity). M6 delivered (in-app notifications, bell polling, notifications page, assignment/comment/mention triggers, hourly due-soon/overdue jobs with dedupe).

---

## 1. Objective

Build a minimal but complete project and task management system for a small team:

- Users, authentication, three roles, role-based access control.
- Projects with members, dates, priority, status, and automatic progress.
- Tasks with assignees, subtasks, priorities, statuses, deadlines, comments, attachments, and activity history.
- List, Kanban, and My Tasks views.
- Dashboard statistics.
- In-app notifications with polling.
- Activity logging.
- Responsive, secure, validated, paginated, with backups.

The implementation must remain deliberately small: no ORM, no Redis, no WebSockets, no email service, no separate frontend/backend deployment.

---

## 2. Key Decisions

| Decision | Choice |
|---|---|
| Backend | SvelteKit server routes, `load` functions, and form actions — **no Express** |
| Rendering | SSR by default, then SvelteKit client-side navigation |
| Database | SQLite via `better-sqlite3`, plain SQL and numbered migrations |
| Mutations | SvelteKit form actions; Superforms + Zod for forms |
| Remote functions | **Not used** — still experimental in SvelteKit 3 |
| Kanban status changes | Board page form action called via `fetch`, parsed with `$app/forms` `deserialize` |
| JSON endpoints | Only three: unread-count, attachment download, health |
| Notifications | Stored in DB; client polls unread count every 30s + on focus |
| File storage | Local private directory, authenticated download route |
| Background jobs | In-process hourly timer started in `init` hook |
| Authentication | Opaque session tokens stored hashed, HttpOnly cookie |
| CSRF | SvelteKit built-in origin checks for form submissions |
| Deployment | `@sveltejs/adapter-node`, single Node process, single instance |
| UI | Tailwind 4 + shadcn-svelte/bits-ui + @lucide/svelte, light theme |
| SvelteKit 3 idioms | `#lib` subpath alias, `src/env.ts` + `$app/env/private`, `resolve()` from `$app/paths` |

---

## 3. Stack

Versions verified against the npm registry at planning time.

| Layer | Package | Version |
|---|---|---|
| Runtime | Node.js | 22.23.x (SvelteKit 3 requires ≥22.17) |
| Framework | `@sveltejs/kit` | 3.2.x |
| UI framework | `svelte` | 5.57.x |
| Build | `vite` | 8.3.x |
| Language | `typescript` | 6.0.x (TS 7 is outside SvelteKit/svelte-check peer ranges) |
| Adapter | `@sveltejs/adapter-node` | 6.0.x |
| Styling | `tailwindcss` | 4.3.x |
| Components | `shadcn-svelte` + `bits-ui` | 1.8.x / 2.21.x |
| Icons | `@lucide/svelte` | 1.73.x |
| Forms | `sveltekit-superforms` | 3.1.x |
| Validation | `zod` | 4.6.x |
| Database | `better-sqlite3` | 13.2.x |
| Passwords | `@node-rs/argon2` | 2.2.x |
| Drag and drop | `svelte-dnd-action` | 0.9.80 |
| Toasts | `svelte-sonner` | 1.2.x |
| Dates | `date-fns` | 4.4.x |
| File type detection | `file-type` | 22.3.x |
| Unit/integration tests | `vitest` | 5.1.x |
| Component tests | `vitest-browser-svelte` | 3.1.x |
| E2E tests | `@playwright/test` | 1.65.x |
| Type checking | `svelte-check` | 4.7.x |

Dev tooling: ESLint + `eslint-plugin-svelte`, Prettier + `prettier-plugin-svelte`.

### SvelteKit 3 conventions (verified in M0)

- **Library alias:** `#lib` maps to `src/lib` through `package.json` `imports`; TypeScript and Vite resolve it natively. `$lib` is no longer generated. TypeScript modules imported through `#lib` need explicit extensions, e.g. `#lib/types.ts` and `#lib/server/db/index.ts`.
- **Environment variables:** declare app variables in `src/env.ts` with `defineEnvVars` from `@sveltejs/kit/env`; import them from `$app/env/private`. Legacy `$env/dynamic/private` is not used.
- **Internal links:** use `resolve()` from `$app/paths` with route IDs, e.g. `resolve('/(app)/projects')` and `resolve('/(auth)/login')`. The ESLint rule `svelte/no-navigation-without-resolve` enforces this.
- **Page state:** `page` comes from `$app/state` (not `$app/stores`).
- **Config:** adapter, CSP, and other SvelteKit options live in the `sveltekit()` Vite plugin in `vite.config.ts`; there is no generated `svelte.config.js`.
- **TypeScript:** stay on 6.0.x; SvelteKit 3 and `svelte-check` peer ranges exclude TypeScript 7.
- **Remote functions:** still experimental in SvelteKit 3; the implementation uses stable `load` functions and form actions.
- **Import extensions:** route/server modules imported through `#lib` use explicit `.ts`; relative imports inside the server layer may remain extensionless because Vite resolves them.
- **`bits-ui` peer warning:** its `runed` dependency still declares a SvelteKit 2 peer range; installation and build succeed with SvelteKit 3. Re-check when adding shadcn-svelte components.

---

## 4. Architecture

```
Browser
   │  SSR HTML + hydration; client-side navigation after load
   ▼
SvelteKit 3 (single Node process)
   ├─ hooks.server.ts
   │   ├─ init: open SQLite, run migrations, start jobs
   │   ├─ handle: security headers, rate limit, session → locals.user
   │   └─ handleError: log and return safe errors
   ├─ +page.server.ts / +layout.server.ts
   │   └─ server load functions → services → SQLite
   ├─ form actions
   │   └─ Zod validation → authorization → service mutation → activity/notification → refresh
   ├─ +server.ts
   │   ├─ GET /api/notifications/unread-count
   │   ├─ GET /attachments/[id]
   │   └─ GET /health
   ├─ data/app.db (WAL)
   ├─ storage/attachments/
   └─ in-process deadline jobs
```

No internal HTTP calls between layers. Server loads and actions import server services directly.

### Request flow examples

**Login**

1. `POST /login?/login` hits the login form action.
2. Zod validates input; rate limiter checks IP + email.
3. Argon2id verifies the password.
4. Session row created; hashed token stored; `sid` cookie set.
5. `event.locals.user` updated manually (the `handle` hook does not re-run).
6. `redirect(303, redirectTo)` with open-redirect protection.

**Kanban move**

1. `svelte-dnd-action` finalizes a cross-column drop.
2. Client optimistically updates local state.
3. Client sends `FormData` to `?/move` on the board page with `fetch`.
4. Server action validates, authorizes, updates status + `completed_at`, logs activity.
5. Client parses the `ActionResult` with `deserialize`.
6. On failure: rollback + toast. On success: background `refreshAll()`.

**Notification bell**

1. Layout server load supplies the initial unread count.
2. Client polls `GET /api/notifications/unread-count` every 30s and on tab focus.
3. Clicking a notification submits a form action that marks it read and redirects to the task.

---

## 5. Repository Layout

```
BeeProjects/
├─ Documentation/specs.md
├─ package.json
├─ vite.config.ts                    # sveltekit({ adapter: adapterNode(), csp, ... })
├─ tsconfig.json
├─ .env.example
├─ .gitignore
├─ README.md
├─ src/
│  ├─ app.html
│  ├─ app.css
│  ├─ app.d.ts                       # App.Locals, App.Error types
│  ├─ env.ts                         # defineEnvVars declarations ($app/env/private)
│  ├─ hooks.server.ts
│  ├─ lib/
│  │  ├─ index.ts                    # #lib alias entry
│  │  ├─ assets/
│  │  ├─ components/
│  │  │  ├─ ui/                      # shadcn-svelte primitives and wrappers
│  │  │  ├─ layout/                  # sidebar, topbar, notification bell
│  │  │  ├─ projects/                # cards, tabs, member list, progress
│  │  │  ├─ tasks/                   # table, filters, forms, detail panels
│  │  │  ├─ board/                   # columns, cards, move menu
│  │  │  └─ activity/                # activity timeline
│  │  ├─ schemas/                    # Zod schemas shared by client and server
│  │  ├─ activity.ts                 # human-readable activity descriptions
│  │  ├─ types.ts                    # safe DTO types importable by components
│  │  ├─ constants.ts                # statuses, priorities, labels, colors
│  │  ├─ format.ts                   # date/timezone/priority formatting
│  │  ├─ mentions.ts                 # mention token parsing/rendering
│  │  └─ server/
│  │     ├─ db/
│  │     │  ├─ index.ts              # singleton connection + pragmas
│  │     │  ├─ migrate.ts            # migration runner (bundled SQL)
│  │     │  ├─ migrate-shared.ts     # shared applyMigrations for CLI + app
│  │     │  ├─ seed.ts               # first-admin seeding
│  │     │  └─ migrations/
│  │     │     ├─ 001_init.sql
│  │     │     └─ index.ts           # import.meta.glob bundling
│  │     ├─ auth/
│  │     │  ├─ session.ts            # create/validate/revoke sessions + cookies
│  │     │  ├─ password.ts           # Argon2id hash/verify
│  │     │  ├─ guards.ts             # requireUser / requireAdmin + temp-password gate
│  │     │  ├─ redirect.ts           # safe local redirect validation
│  │     │  └─ rate-limit.ts         # in-memory login limiter
│  │     ├─ services/
│  │     │  ├─ users.ts
│  │     │  ├─ projects.ts
│  │     │  ├─ tasks.ts
│  │     │  ├─ comments.ts
│  │     │  ├─ attachments.ts
│  │     │  ├─ notifications.ts
│  │     │  ├─ dashboard.ts
│  │     │  └─ activity.ts
│  │     ├─ permissions.ts
│  │     ├─ events/
│  │     │  ├─ activity.ts           # typed activity writers
│  │     │  └─ notifications.ts      # notification creation + dedupe
│  │     ├─ uploads.ts
│  │     ├─ jobs.ts
│  │     └─ dates.ts
│  └─ routes/
│     ├─ +layout.svelte
│     ├─ +error.svelte
│     ├─ (auth)/login/+page.svelte
│     ├─ (auth)/login/+page.server.ts
│     ├─ (app)/+layout.svelte
│     ├─ (app)/+layout.server.ts
│     ├─ (app)/+page.svelte
│     ├─ (app)/+page.server.ts
│     ├─ (app)/projects/...
│     ├─ (app)/tasks/...
│     ├─ (app)/my-tasks/...
│     ├─ (app)/notifications/...
│     ├─ (app)/profile/...
│     ├─ (app)/admin/...
│     ├─ api/notifications/unread-count/+server.ts
│     ├─ attachments/[id]/+server.ts
│     └─ health/+server.ts
├─ static/
├─ data/                             # app.db, gitignored
├─ storage/attachments/              # gitignored
├─ scripts/
│  ├─ backup.sh
│  ├─ migrate.ts
│  ├─ seed.ts
│  └─ seed-demo.ts
├─ tests/
│  ├─ unit/
│  ├─ http/
│  └─ e2e/
└─ build/                            # generated, gitignored
```

`#lib` is configured in `package.json`:

```json
"imports": {
	"#lib": "./src/lib/index.js",
	"#lib/*": "./src/lib/*"
}
```

---

## 6. Environment Configuration

`.env.example`:

```dotenv
# Runtime
PORT=3000
HOST=127.0.0.1
ORIGIN=http://localhost:3000

# Storage
DATABASE_PATH=./data/app.db
UPLOAD_DIR=./storage/attachments
BODY_SIZE_LIMIT=12M

# Sessions
SESSION_TTL_DAYS=30

# Jobs
JOBS_ENABLED=true

# First admin (used by pnpm db:seed)
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-please

# Reverse proxy (production)
# PROTOCOL_HEADER=x-forwarded-proto
# HOST_HEADER=x-forwarded-host
# ADDRESS_HEADER=x-forwarded-for
# XFF_DEPTH=1
```

Notes:

- `BODY_SIZE_LIMIT` must be raised: adapter-node defaults to **512 KB**, which is too small for attachments.
- `ORIGIN` is used by adapter-node for CSRF checks and URL construction. It must match the public origin.
- Production does **not** auto-load `.env`; start with `NODE_ENV=production node --env-file=.env build`.
- `JOBS_ENABLED=false` in tests to prevent timers.
- `PORT`, `HOST`, `ORIGIN`, `BODY_SIZE_LIMIT`, and reverse-proxy headers are consumed by adapter-node/Vite, not by `src/env.ts`.

### Application environment declarations

SvelteKit 3 declares app-level env vars in `src/env.ts`:

```ts
import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

export const variables = defineEnvVars({
	DATABASE_PATH: { schema: z.string().min(1).default('./data/app.db') },
	UPLOAD_DIR: { schema: z.string().min(1).default('./storage/attachments') },
	SESSION_TTL_DAYS: {
		schema: (value) => {
			const parsed = Number(value ?? 30);
			if (!Number.isInteger(parsed) || parsed <= 0) throw new Error('must be a positive integer');
			return parsed;
		}
	},
	JOBS_ENABLED: {
		schema: z
			.string()
			.optional()
			.transform((value) => value !== 'false')
	}
});
```

These are imported from `$app/env/private`:

```ts
import { DATABASE_PATH, JOBS_ENABLED } from '$app/env/private';
```

Do not use the legacy `$env/dynamic/private` module.

---

## 7. Data Model

All primary keys are UUID text (`crypto.randomUUID()`), except `roles.id`. Timestamps are UTC ISO strings. Calendar dates use `YYYY-MM-DD`.

### 7.1 Tables

```
users(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,          -- stored lowercase
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)

roles(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,           -- admin | project_manager | member
  description TEXT NOT NULL
)

sessions(
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT
)

projects(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL REFERENCES users(id),
  start_date TEXT,
  due_date TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('Low','Medium','High')),
  status TEXT NOT NULL CHECK (status IN ('Planning','Active','On Hold','Completed','Archived')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)

project_members(
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  added_by TEXT NOT NULL REFERENCES users(id),
  added_at TEXT NOT NULL,
  PRIMARY KEY (project_id, user_id)
)

tasks(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id TEXT REFERENCES tasks(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  priority TEXT NOT NULL CHECK (priority IN ('Low','Medium','High','Urgent')),
  status TEXT NOT NULL CHECK (status IN ('Backlog','To Do','In Progress','Review','Done')),
  start_date TEXT,
  due_date TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
)

task_assignees(
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (task_id, user_id)
)

task_comments(
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
)

task_attachments(
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
)

activities(
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project','task')),
  entity_id TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata TEXT,                       -- JSON string when needed
  created_at TEXT NOT NULL
)

notifications(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'task_assigned','task_reassigned','comment_added','mention','due_soon','overdue'
  )),
  title TEXT NOT NULL,
  body TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  comment_id TEXT REFERENCES task_comments(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id),
  is_read INTEGER NOT NULL DEFAULT 0,
  dedupe_key TEXT,
  created_at TEXT NOT NULL,
  read_at TEXT,
  UNIQUE (user_id, dedupe_key)
)
```

### 7.2 Indexes

```
users(email) UNIQUE
users(role_id), users(is_active)
sessions(user_id), sessions(expires_at)
projects(status), projects(owner_id), projects(status, owner_id)
project_members(user_id)
tasks(project_id, status), tasks(due_date), tasks(parent_task_id), tasks(deleted_at)
task_assignees(user_id)
task_comments(task_id, created_at)
task_attachments(task_id)
activities(entity_type, entity_id, created_at DESC)
activities(actor_id, created_at DESC)
notifications(user_id, is_read, created_at DESC)
notifications(user_id, dedupe_key) UNIQUE (dedupe_key may be NULL)
```

### 7.3 Constraints and integrity rules

- Status/priority values enforced by `CHECK`.
- `due_date >= start_date` validated in application code and tests.
- `parent_task_id` must reference a **top-level** task in the **same project** (one level of subtasks).
- Assignees must be active `project_members`; validated on every assignment change.
- Project owner is always inserted into `project_members` on creation.
- Owner cannot be removed from the project.
- A member with open (not `Done`, not deleted) tasks cannot be removed until reassigned.
- A PM who owns non-archived projects cannot be demoted or deactivated until ownership is transferred.
- The last active admin cannot be deactivated or demoted.
- Users are never hard-deleted; they are deactivated.
- Projects are archived, not deleted.
- Tasks, comments, and attachments are soft-deleted via `deleted_at`.

### 7.4 Database pragmas

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```

Migrations run in a transaction at startup via the `init` hook, tracked in `schema_migrations(version, applied_at)`. Roles are seeded idempotently in the initial migration.

---

## 8. Roles and Permissions

Global role + project ownership. A Project Manager gets manager powers only on projects they own. As a member of someone else's project, they follow member rules.

| Action | Admin | PM (owner) | PM (non-owner) / Member | Non-member |
|---|---|---|---|---|
| Manage users | ✅ | — | — | — |
| Create project | ✅ | ✅ | — | — |
| View project | all | owned + member | member only | — |
| Edit / archive project | ✅ | owned | — | — |
| Reassign project owner | ✅ | — | — | — |
| Add / remove members | ✅ | owned | — | — |
| Create / delete task | ✅ | owned | — | — |
| Edit task fields | ✅ | owned | assigned tasks only | — |
| Change assignees | ✅ | owned | — | — |
| Move status | ✅ | owned | assigned tasks only | — |
| Comment / attach | ✅ | any visible | any visible | — |
| Edit/delete comment | any | owned project | own comment | — |
| Delete attachment | any | owned project | own upload | — |
| View activity | all | owned | member | — |
| Notifications | own | own | own | own |

Implementation:

- `src/lib/server/permissions.ts` exposes `can(user, action, resource)` plus `requireProjectAccess`, `requireTaskAccess`, `assertCanManageProject`.
- Every load, action, and endpoint calls the permission layer.
- UI permission flags are returned in DTOs to hide unusable actions; they are never the security boundary.
- Tests cover the full matrix, including negative cases.

---

## 9. Routes and Page Behavior

| Route | Server files | Purpose / behavior |
|---|---|---|
| `/login` | `(auth)/login/+page.server.ts` | Load redirects authed users; action validates, rate-limits, creates session, safe redirect |
| `/` | `(app)/+page.server.ts` | Dashboard stats, My Work, project overview |
| `/projects` | `+page.server.ts` | List with status/owner filters, search, pagination |
| `/projects/new` | `+page.server.ts` | Create project (Admin/PM only) |
| `/projects/[id]` | `+layout.server.ts`, `+page.server.ts` | Membership guard + summary; overview; archive action |
| `/projects/[id]/edit` | `+page.server.ts` | Edit project; admin-only owner reassignment |
| `/projects/[id]/list` | `+page.server.ts` | Task table with search/filter/sort/pagination |
| `/projects/[id]/board` | `+page.server.ts` | Kanban grouped by status; `?/move` action |
| `/projects/[id]/tasks/new` | `+page.server.ts` | Create task or subtask |
| `/projects/[id]/members` | `+page.server.ts` | Add/remove members |
| `/projects/[id]/activity` | `+page.server.ts` | Paginated project activity |
| `/tasks/[id]` | `+page.server.ts` | Detail, subtasks, comments, files, activity; update/status/delete/comment/upload actions |
| `/my-tasks` | `+page.server.ts` | Assigned tasks grouped by status, overdue/upcoming highlighting |
| `/notifications` | `+page.server.ts` | List, unread filter, mark read/all, open-and-redirect |
| `/profile` | `+page.server.ts` | Name, timezone, change password, logout |
| `/admin/users` | `(app)/admin/+page.server.ts` | Admin guard; user list/filter/pagination |
| `/admin/users/new` | `+page.server.ts` | Create user with temporary password |
| `/admin/users/[id]` | `+page.server.ts` | Edit, deactivate/reactivate, reset password |
| `/api/notifications/unread-count` | `+server.ts` GET | Lightweight polling endpoint |
| `/attachments/[id]` | `+server.ts` GET | Authenticated private download |
| `/health` | `+server.ts` GET | Liveness + DB check |

### Page details

- **Dashboard:** five stat cards (active projects, open tasks, completed tasks, overdue, due today); My Work columns (assigned, overdue, upcoming, recently updated); project overview table with progress bars.
- **Projects list:** status + owner filters, search, progress, members count, due date, priority. Archived hidden by default.
- **Project layout:** name, status, priority, dates, owner, progress, tabs (Overview, List, Board, Members, Activity).
- **List view:** columns (title, assignees, priority, status, due date, updated); search; filters for status, priority, assignee, due date; sort by due date, priority, creation date; pagination.
- **Board:** five columns (Backlog, To Do, In Progress, Review, Done); top-level tasks only; subtask count badge; drag-and-drop; "Move to…" menu fallback.
- **My Tasks:** grouped by status; overdue red, upcoming amber; completed toggle.
- **Task detail:** overview/edit form, subtasks, comments, attachments, activity timeline. Read-only for users without edit permission.
- **Notifications:** unread filter, mark one/all read, click-through to task.
- **Admin users:** list, create, edit, deactivate/reactivate, reset password; temp password shown once.
- **Profile:** name, timezone, password change, logout.

Create/edit flows are dedicated pages, not modals — simpler progressive enhancement, deep links, and testing. Dialogs are used only for confirmations (archive, delete, deactivate).

### M2 implementation notes

- Project routes are a nested layout: Overview, List, Board, Members, Activity. List is live from M3; Board is a placeholder until M4.
- Project list defaults to `open` status (everything except Archived), with `all` plus explicit status filters; 12 cards per page.
- Project forms exclude `Archived` from the status select; archive/unarchive are dedicated actions on the overview page.
- Archived projects are read-only: edit, membership changes, and task mutations are rejected server-side; unarchive restores `Planning`.
- Admin owner transfer lives on the edit page, adds the new owner as a member, and keeps the previous owner as a member.
- Owner removal is blocked; member removal is blocked while they have open assigned tasks.
- Progress = completed tasks / all non-deleted tasks (including subtasks); 0% with no tasks.
- Project activity page aggregates project events and task events belonging to the project, 20 per page.
- Core files: `services/projects.ts`, `services/activity.ts`, `permissions.ts`, `schemas/projects.ts`, and the `projects/[id]` route tree.

### M3 implementation notes

- Task creation lives at `projects/[id]/tasks/new`; create with `?parent=<id>` for a subtask.
- Task detail is a standalone route at `/tasks/[id]` with inline editing, subtasks, and task activity.
- Multiple assignees use checkbox groups; the server validates active project membership and retains existing assignees when editing.
- Members can edit fields/status/dates on tasks assigned to them, but assignee changes and deletion are manager-only.
- One level of subtasks; the parent must be a top-level task in the same project. Deleting a parent soft-deletes its subtasks.
- The List view shows top-level tasks and subtasks; Kanban shows top-level tasks only.
- List filters: search, status, priority, assignee, due (`overdue`, `today`, `next 7 days`), sort by created date/due date/priority, direction, 20 per page.
- Overdue is calculated using the viewer's timezone; completion timestamps are maintained automatically.
- Task activity uses the same `activities` table and appears in both the task timeline and the project activity page.
- Core files: `services/tasks.ts`, `schemas/tasks.ts`, `tasks/[id]/`, and `projects/[id]/tasks/new/`.

### M4 implementation notes

- The board uses `dragHandleZone` + `dragHandle`, so only the grip handle starts a drag and links/status menus remain clickable. Keyboard drag is supported by the library.
- Each card also has a status `<select>` fallback for keyboard/touch users and for environments where drag fails.
- Board moves call the board page `?/move` form action via `fetch` + `deserialize`. The UI updates optimistically, then calls `refreshAll()`; failures show a toast and restore server state.
- The server enforces the same move permission as the task editor: managers can move any task, member-assignees only their own, and archived projects are read-only.
- Board columns show top-level tasks only, sorted by priority then due date, with subtask completion badges.
- My Tasks defaults to open tasks, supports `?includeCompleted=1`, and excludes archived projects.
- Dashboard counts and My Work are viewer-scoped (Admin sees all; others see owned/member projects). Deadlines use the viewer's timezone.
- Dashboard limits: My Work lists 5 items each, recently updated = last 7 days, project overview = 6 projects with a total count.
- `TaskMiniCard.svelte` is shared by My Tasks, dashboard sections, and recent updates.
- Core files: `services/dashboard.ts`, `services/tasks.ts` (`queryTasks`, `listMyTasks`, `listBoardTasks`, `moveTaskStatus`), `projects/[id]/board/`, `my-tasks/`, and `(app)/+page.server.ts`.

### M5 implementation notes

- Comments are stored in `task_comments`, loaded chronologically, and soft-deleted.
- Authors can edit/delete their own comments; admins and project owners can edit/delete any comment. Archived projects reject all collaboration mutations.
- Mentions use the token format `@[Display Name](userId)`. `@` opens an active-project-member picker (max 6 suggestions) and inserts the token at the cursor.
- The server re-parses mention IDs on comment create/update and rejects users who are not active project members. Mentions render as chips via `CommentBody.svelte`.
- Attachments are validated by extension, declared MIME, size, and magic bytes using `file-type`. Max 10 MB; `BODY_SIZE_LIMIT=12M` is required in production.
- Files are stored under `storage/attachments/<taskId>/` with UUID names and served only through `/attachments/[id]` after a project-access check.
- Uploaders, project owners, and admins can delete attachments; downloads remain available to project members for archived projects.
- Attachment deletion is a soft delete; the file remains on disk for backups/audit until manual cleanup.
- Activity events: `task.comment_added`, `task.comment_edited`, `task.comment_deleted`, `task.attachment_added`, `task.attachment_removed`.
- Core files: `services/comments.ts`, `services/attachments.ts`, `mentions.ts`, `schemas/collaboration.ts`, `CommentBody.svelte`, `MentionTextarea.svelte`, and the attachment download route.

### M6 implementation notes

- Notification rows are created in the same transaction as the triggering assignment or comment.
- Assignment notifications: new task assignees get `task_assigned`; additions to an already-assigned task and removals get `task_reassigned`. The actor is skipped.
- Comment notifications go to unique task assignees plus the task creator. Mentioned users get only `mention`, not `comment_added`.
- The bell receives the initial unread count and five recent notifications from the app layout load, then polls `/api/notifications/unread-count` every 30 seconds and on tab focus.
- The notifications page supports all/unread filters, per-item mark-read, mark-all-read, and an `open` action that marks read and redirects to the task.
- Deadline jobs run hourly from the in-process timer. Due-soon fires at the first tick after 08:00 in the assignee timezone for tasks due tomorrow; overdue fires once after the due date.
- Dedupe keys: `due_soon:<task>:<user>:<due_date>` and `overdue:<task>:<user>:<due_date>`; the unique `(user_id, dedupe_key)` index enforces them.
- Archived projects, deleted/done tasks, and inactive users are excluded from deadline notifications.
- Single app instance required because jobs and rate limiting are in-process.
- Core files: `services/notifications.ts`, `NotificationBell.svelte`, `notifications/`, `api/notifications/unread-count/`, and `jobs.ts`.

---

## 10. Server Loading, Actions, and Endpoints

### 10.1 Load functions

- Root `(app)/+layout.server.ts` requires a user and returns the public user + unread count; redirects unauthenticated users to `/login?redirectTo=<path>`.
- `(app)/admin/+layout.server.ts` returns 403 for non-admins.
- Project layout load validates visibility once; child loads reuse `parent()` data.
- Dashboard, projects list, task list, board, My Tasks, notifications, admin users, and task detail each have a server load that:
  1. Parses URL search params with Zod.
  2. Calls the relevant service.
  3. Returns DTOs + pagination metadata + permission flags.

No client-side fetch for page data. No internal HTTP.

### 10.2 Form actions

| Area | Actions |
|---|---|
| Login | `login` |
| Logout | `logout` (profile/layout) |
| Profile | `updateProfile`, `changePassword` |
| Projects | `create`, `update`, `archive`, `reassignOwner` |
| Members | `addMember`, `removeMember` |
| Tasks | `create`, `update`, `move`, `delete`, `addComment`, `editComment`, `deleteComment`, `uploadAttachment`, `deleteAttachment` |
| Notifications | `markRead`, `markAllRead`, `open` |
| Admin users | `create`, `update`, `deactivate`, `reactivate`, `resetPassword` |

All actions:

1. Require an authenticated user (except login).
2. Parse/validate input with Zod.
3. Re-check resource permissions.
4. Run the mutation in a transaction where multiple tables change.
5. Write activity rows and notifications.
6. `redirect(303, ...)` or return `fail(status, { form, message })`.
7. Superforms handles field errors; `refreshAll()` updates page data.

### 10.3 JSON endpoints

Only three, all intentionally small:

- `GET /api/notifications/unread-count` — session required; returns `{ count }`; `Cache-Control: no-store`.
- `GET /attachments/[id]` — session + project membership required; streams the file; no public directory.
- `GET /health` — no auth; `SELECT 1`; returns `{ ok: true, version }`.

Kanban moves use the board page's `?/move` form action, not a JSON endpoint, so CSRF origin checks apply.

---

## 11. Authentication and Sessions

### 11.1 Session lifecycle

- 32 random bytes, base64url-encoded token; only SHA-256 hash stored in `sessions`.
- Cookie `sid`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, `Max-Age` 30 days.
- `hooks.server.ts` validates cookie → session → active user on every request; populates `locals.user` and `locals.session`.
- Expired sessions are rejected and deleted.
- `last_seen_at` updates at most once per hour.
- Logout deletes the session row and cookie.
- Password change, admin reset, and deactivation revoke the user's sessions.
- Expired session cleanup runs in the daily job.

### 11.2 Login

- Email normalized to lowercase; password checked with Argon2id.
- Generic failure message: "Invalid email or password."
- Rate limit: 10 failed attempts per 15 minutes per IP + email; successful login resets the counter.
- On success: create session, set cookie, update `locals.user`, update `last_login_at`, redirect.
- `redirectTo` accepted only when it starts with `/` and not `//`; otherwise `/`.
- Users with `must_change_password = 1` are redirected to `/profile?force=1` until changed.

### 11.3 Password management

- Minimum 10 characters, maximum 128; no composition rules.
- Self-service change requires current password and confirmation.
- Admin reset sets a temporary password and `must_change_password = 1`, then revokes sessions.
- No email-based reset in Phase 0 (out of scope; admin resets).

### 11.4 Guards

- `(app)` layout: unauthenticated → login redirect.
- `(app)/admin` layout: non-admin → 403 error page.
- Every action and endpoint repeats authorization; load guards are UX only.
- `requireUser()` and `requireAdmin()` in `src/lib/server/auth/guards.ts` are used in every protected load and action.
- `requireUser()` redirects users with `must_change_password = 1` to `/profile?force=1`; only profile actions pass `{ allowPendingPassword: true }`. This prevents a temporary password from being used for any mutation.
- Admin actions enforce: no self-deactivation, no self role change, last active admin protection, and no demotion/deactivation of users who own non-archived projects.

---

## 12. Validation and Forms

- Zod schemas live in `src/lib/schemas/` and are imported by both server actions and components.
- Superforms 3 + Zod 4:
  - `superValidate` on the server for GET forms and actions.
  - `superForm` on the client for validation and progressive enhancement.
  - Returns `fail(422, { form })` on invalid input.
- Every form works without JavaScript (native POST + server-rendered errors).
- Server-side validation is authoritative and separate from permission checks.
- Filter/search forms use `method="GET"` and URL search params; server loads parse and clamp values.
- Long text fields enforce maximum lengths matching the DB expectations.
- On success, show a toast via `svelte-sonner` and refresh page data.

---

## 13. Business Rules

### 13.1 Project progress

```
progress = round(completed_tasks / total_tasks * 100)
```

- Total tasks: all non-deleted tasks in the project, **including subtasks**.
- Completed: status `Done`.
- 0% when there are no tasks.
- Status remains manual (no auto-complete).

### 13.2 Dashboard statistics

Viewer-scoped, non-archived projects:

- **Active projects:** `status = 'Active'`.
- **Open tasks:** not `Done` and not deleted.
- **Completed tasks:** `Done`.
- **Overdue tasks:** `due_date < viewer's local today` and not `Done`.
- **Due today:** `due_date = viewer's local today` and not `Done`.
- **My Work / assigned:** tasks assigned to the viewer, not deleted.
- **My Work / overdue:** assigned, overdue, not `Done`.
- **My Work / upcoming:** assigned, due within 7 days, not `Done`.
- **Recently updated:** tasks in visible projects updated in the last 7 days.
- **Project overview:** visible non-archived projects with total/completed counts and progress.

Admins see all projects; PMs and members see owned/member projects only.

### 13.3 Dates and timezones

- Timestamps stored as UTC ISO strings.
- Start/due dates stored as calendar dates (`YYYY-MM-DD`).
- Users have a `timezone` (IANA name, default `UTC`).
- "Today", overdue, and due-soon calculations use the relevant user's timezone.
- Shared `Intl`-based formatter receives the user timezone so SSR and hydration output match.
- No `Date.now()` or local-timezone formatting inside render paths.

### 13.4 Assignments

- Multiple assignees per task.
- Only active project members can be assigned.
- Assigning/removing logs activity and creates notifications.
- Deactivated users keep historical assignments, displayed with an "inactive" badge; they are excluded from assignment pickers and notifications.
- Members can update fields on tasks assigned to them (title, description, priority, dates, status) but cannot change assignees, project, create tasks, or delete tasks.
- Admin/owner PM can assign/reassign anyone in the project.

### 13.5 Subtasks

- One level only; a parent must be a top-level task in the same project.
- Subtasks inherit the project.
- Deleting a parent soft-deletes its subtasks after confirmation and logs the action.
- Board shows top-level tasks with a subtask count; task detail shows the subtask list.

### 13.6 Membership and ownership

- Creating a project inserts the owner into `project_members`.
- Adding a member requires an active user.
- Removing a member is blocked while they have open tasks in the project.
- Owner cannot be removed.
- Only admins can reassign ownership; the new owner must be an active PM/admin and becomes a member.
- A PM with non-archived owned projects cannot be demoted or deactivated until ownership is transferred.

### 13.7 Task lifecycle

- `completed_at` is set when status becomes `Done`, cleared when moved out of `Done`.
- Deleting a task is a soft delete; it disappears from lists, boards, dashboard counts, and My Tasks.
- Activity and comments remain for audit but are hidden with the task.
- Archived projects are read-only in the UI: no task/member mutations.

### 13.8 Search, sorting, pagination

- Search: `LIKE` on task title/description (case-insensitive for ASCII); project search on name.
- Task sorts: due date, priority rank (Urgent > High > Medium > Low), creation date; ascending/descending.
- Server-side pagination: default 25, maximum 100; comments/activity use 20-item load-more.
- Every list query includes `deleted_at IS NULL` and visibility constraints.
- FTS5 is a documented future upgrade, not Phase 0.

### 13.9 Notifications

| Type | Trigger | Recipients | Dedupe |
|---|---|---|---|
| `task_assigned` | Assignee added to a task with no existing assignees | Added user | none |
| `task_reassigned` | Assignee added to an already-assigned task, or removed | Added/removed user | none |
| `comment_added` | New comment | Assignees + task creator except author | none |
| `mention` | Comment contains a valid mention token | Mentioned project members except author | none |
| `due_soon` | First hourly tick after 08:00 assignee-local, one day before due | Assignees | `due_soon:<task>:<user>:<due_date>` |
| `overdue` | First hourly tick after the due date passes in assignee-local time | Assignees | `overdue:<task>:<user>:<due_date>` |

- Mentioned users receive only the `mention` notification, not also the generic comment one.
- Deactivated users receive nothing.
- Dedupe is enforced by the unique `(user_id, dedupe_key)` index.
- Notification click marks read and redirects to the task.
- The bell polls unread count every 30 seconds and on window focus.
- Mark-all-read is a form action; read state is per user.

### 13.10 Mentions

- Typing `@` opens a picker of active project members.
- Inserts a stable token: `@[Display Name](userId)`.
- Server parses tokens, validates the user exists, is active, and is a member of the task's project.
- Comments render as plain text with mention tokens replaced by highlighted name chips; no raw HTML injection.
- Invalid tokens render as plain text and notify nobody.

### 13.11 Activity logging

| Entity | Actions |
|---|---|
| Project | `created`, `updated.<field>`, `archived`, `owner_changed`, `member_added`, `member_removed` |
| Task | `created`, `updated.<field>`, `status_changed`, `assignee_added`, `assignee_removed`, `deleted`, `comment_added`, `attachment_added`, `attachment_removed` |

- One row per changed field; no-op updates are skipped.
- Actor, old value, new value, and optional metadata stored.
- Comment bodies are not duplicated in activity; the event references the comment.
- Activity is append-only and paginated newest-first.
- Project activity page aggregates project and task events for the project.

### 13.12 Files

- Max 10 MB per file; request body capped at 12 MB.
- Allowed: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, PNG, JPG/JPEG, WEBP, GIF, ZIP.
- Validate extension, declared MIME, and magic bytes (`file-type`); reject executables/unknown types.
- Store UUID filenames under `storage/attachments/<taskId>/`; original name kept only in DB.
- Download requires session + project access; streams with `Content-Disposition: attachment`.
- Soft delete only; no hard delete in Phase 0.
- Filenames sanitized in headers; no path traversal; no direct static serving.

---

## 14. Background Jobs

Started in `hooks.server.ts` `init` (skip when building or `JOBS_ENABLED=false`), stopped on `process.on('sveltekit:shutdown')`.

Hourly tick:

1. **Due soon:** for each assignee, if their local time is ≥08:00 and the task is due tomorrow, create one notification with dedupe key `due_soon:<task>:<user>:<due_date>`.
2. **Overdue:** if the task's due date is before the assignee's local today and status is not `Done`, create one notification with dedupe key `overdue:<task>:<user>:<due_date>`.
3. **Session cleanup:** delete expired sessions once per day.

Guard the interval and DB singleton with `globalThis` to survive dev HMR. Single app instance assumption is documented; multiple instances would duplicate jobs.

---

## 15. UI/UX and Design System

- **Direction:** dense, neutral productivity UI; off-white background, white cards, slate text, one indigo accent, semantic status/priority colors, 1px borders, minimal shadows.
- **Type:** Inter with system fallback; 14px UI text, 16px form inputs, 1.5 line height.
- **Spacing:** 8px grid; compact tables; 44px minimum touch targets.
- **Light theme only** for Phase 0 (dark mode deferred).
- shadcn-svelte components for dialogs, menus, selects, tabs, tooltips, badges, and buttons.
- @lucide/svelte icons only; no emoji icons.
- Internal navigation uses `resolve()` from `$app/paths` with route IDs (`resolve('/(app)/projects')`), never hardcoded `href` values; ESLint enforces this.
- Status colors: Backlog gray, To Do blue, In Progress amber, Review violet, Done green.
- Priority colors: Low gray, Medium blue, High amber, Urgent red.
- Loading skeletons, empty states with CTAs, inline validation, focus rings, keyboard access.
- Sidebar collapses below 1024px; tables become card rows below 768px; board scrolls horizontally.
- Kanban cards: title, priority chip, due date (red when overdue), assignee avatars, subtask count.
- Notification bell with unread badge and recent dropdown.
- No horizontal page scroll; no removal of focus outlines; no placeholder-only labels.
- Dates shown using the user's timezone; relative labels ("Due in 2 days") computed server-side or via shared formatter.

---

## 16. Security and Non-Functional Requirements

### Security

- Argon2id password hashing.
- Session token hashing; HttpOnly/SameSite/Secure cookie; rotation on login.
- Login rate limiting; generic error messages; no user enumeration.
- CSRF: SvelteKit origin checks for form actions; `ORIGIN` configured correctly; `trustedOrigins` empty.
- CSP via SvelteKit `csp` (`mode: 'auto'`, self-only scripts/styles, `frame-ancestors 'none'`).
- Additional headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS at proxy.
- Server-only modules under `#lib/server`; SvelteKit prevents client imports.
- Prepared SQL statements only; no string interpolation of values.
- Authorization re-checked in every load/action/endpoint.
- Upload allowlist, magic-byte validation, private storage, authenticated download.
- Safe error responses; `handleError` logs details server-side only.
- Open-redirect protection for `redirectTo`.
- Last-admin and PM-ownership guards prevent lockout/orphaned projects.
- No secrets in client bundles; runtime secrets via `$app/env/private` (`src/env.ts`).

### Non-functional

- Responsive layout and touch targets.
- Server-side validation on every mutation.
- Pagination on all growing lists; indexes for filters/sorts.
- Consistent timezone handling.
- SQLite WAL + busy timeout; single instance.
- Soft deletion where appropriate.
- Activity logging for important operations.
- Backup script for DB + uploads.
- Accessible forms, focus management, keyboard-operable DnD fallback.
- Performance: indexed queries, pagination, no N+1 (batch assignee queries).

---

## 17. Testing Strategy

### Unit tests (Vitest, node environment)

- Permission matrix, including negative cases.
- Project progress calculation.
- Timezone/date boundary logic (overdue, due today, due soon).
- Mention token parsing and membership validation.
- Notification dedupe keys.
- Zod schema edge cases.

### Service integration tests (Vitest + in-memory SQLite)

- Migrations apply cleanly to a fresh database.
- CRUD for users, projects, tasks, comments, attachments.
- Soft-delete filtering.
- Filters, sorting, pagination.
- Activity diffs (one row per changed field, no-op skipped).
- Assignment/removal notifications.
- Member removal guard.
- Owner transfer and last-admin guard.

### HTTP integration tests

- Build the app once, import `build/handler.js`, mount on an ephemeral `http.createServer`, use a cookie jar helper.
- Set `DATABASE_PATH`/`UPLOAD_DIR` to temp paths, `JOBS_ENABLED=false`, `NODE_ENV=production` for CSRF tests.
- Cover:
  - Unauthenticated redirect to `/login`.
  - Login success/failure, rate limiting, open-redirect rejection.
  - CSRF rejection for a cross-origin form POST.
  - 403 for non-admin admin routes and non-member project routes.
  - Project/task form actions.
  - Kanban `?/move` action and permission failure.
  - Comment mention notification.
  - Attachment upload size/type rejection and download authorization.
  - Notification mark-read ownership.

### Component tests (Vitest browser mode + `vitest-browser-svelte`)

- Task form validation and error display.
- Filter bar URL updates.
- Action visibility based on permission flags.
- Board "Move to…" menu fallback.

### E2E tests (Playwright)

- Admin creates user → project → task; PM assigns; member moves card to Done, comments, and receives notification.
- Attachment upload and download.
- Archived project is read-only/hidden.
- Deep-link refresh on board/task pages.
- Run against `pnpm build && node build` with a seeded test DB.

### Static checks

- `svelte-check` with TypeScript 6.
- ESLint (Svelte plugin) + Prettier check.
- CI order: install → svelte-check → unit/service → build → HTTP → Playwright.

### Manual acceptance

Final pass against the 12 completion criteria in spec §7.

---

## 18. Deployment and Backups

### Build and run

```bash
pnpm install --frozen-lockfile
pnpm build
node --env-file=.env build
```

- Node 22.23.x.
- `@sveltejs/adapter-node` outputs `build/`.
- Production must set `ORIGIN` and `BODY_SIZE_LIMIT=12M`.
- Behind Caddy/nginx: set `PROTOCOL_HEADER`, `HOST_HEADER`, `ADDRESS_HEADER`, `XFF_DEPTH`.
- Single instance only (SQLite + in-process jobs).

### systemd / Docker

- systemd service with `WorkingDirectory`, `EnvironmentFile`, `ExecStart=node build`, restart on failure.
- Optional Docker image from `node:22-slim`, volume mounts for `data/` and `storage/`, non-root user.
- Graceful shutdown via `sveltekit:shutdown`: stop jobs, close DB.

### Backups

`scripts/backup.sh`:

1. `sqlite3 "$DATABASE_PATH" ".backup '$DEST/app-$(date +%F-%H%M).db'"`
2. `tar -czf "$DEST/uploads-$(date +%F-%H%M).tar.gz" "$UPLOAD_DIR"`
3. Retain 14 days.
4. Document restore: stop app, restore DB, restore uploads, start app.

Backups must include uploads; DB-only backups are incomplete.

### Health

- `GET /health` returns 200 when `SELECT 1` succeeds; used by systemd/Docker/proxy checks.

---

## 19. Implementation Milestones

| # | Deliverable | Exit criteria | Est. |
|---|---|---|---|
| M0 ✅ | Scaffold, adapter-node, Tailwind/shadcn, DB layer/migrations, `init` hook, seed, `/health`, base layout, git init + `.gitignore` | `pnpm dev` runs; migrations applied; admin seeded; health OK; check/lint/build pass | Done |
| M1 ✅ | Sessions, login/logout, rate limit, password change/reset, admin user pages, guards, last-admin protection | Spec §7.1; deactivated users blocked; sessions revoked; temp-password flow enforced | Done |
| M2 ✅ | Projects/members, project layout/tabs, archive, owner reassignment, activity foundation | Spec §7.2–7.3; ownership and member guards enforced; project filters/pagination; activity timeline | Done |
| M3 ✅ | Tasks, assignees, subtasks, activity, List view with search/filter/sort/pagination, task detail | Spec §7.4–7.5, §7.9 (task events); member-assignee edit rules; soft-delete cascade | Done |
| M4 ✅ | Kanban DnD action, My Tasks, dashboard, progress calculation | Spec §7.6–7.7, §7.11; top-level board; member move rules; viewer-scoped stats | Done |
| M5 ✅ | Comments/mentions, attachments, comment/file activity integration | Spec §7.8–7.9; chronological comments; mention validation; private authenticated downloads | Done |
| M6 ✅ | Notifications UI + polling + due-soon/overdue jobs + dedupe | Spec §7.10; assignment/comment/mention triggers; per-user timezone; one-per-due-date dedupe | Done |
| M7 | A11y/responsive polish, HTTP/component/E2E tests, backup script, README, acceptance pass | All §7 criteria + NFR checklist | 2.5d |

**Total:** approximately 19 dev-days for one developer including tests.

---

## 20. Acceptance Criteria Mapping (Spec §7)

| # | Criterion | Delivered by |
|---|---|---|
| 1 | Admin can manage system users | M1 |
| 2 | Project managers can create and manage projects | M2 |
| 3 | Projects support multiple members | M2 |
| 4 | Users can create, assign, and manage tasks | M3 |
| 5 | Tasks support priorities, deadlines, statuses | M3 |
| 6 | Users can view assigned tasks across projects | M4 |
| 7 | Tasks managed through List and Kanban views | M3, M4 |
| 8 | Users can comment and attach files | M5 |
| 9 | Task activities are recorded | M3, M5 |
| 10 | In-app notifications work | M6 |
| 11 | Dashboard statistics are accurate | M4 |
| 12 | Access permissions enforced consistently | M1–M6, tested in M7 |

---

## 21. Out of Scope (Phase 0)

Per spec §6:

- Gantt charts.
- Time tracking.
- Timesheets.
- Budget and expense management.
- Invoicing.
- Resource planning.
- Recurring tasks.
- Advanced workflow automation.
- Custom fields.
- Advanced reporting.
- AI features.
- External integrations.
- Client portals.
- Mobile applications.

Also deferred: dark mode, email notifications, self-registration, password reset by email, manual Kanban ordering, FTS5 search, real-time push, multi-instance deployment.

---

## 22. Assumptions and Defaults

1. Members can edit tasks assigned to them (except assignees/project); they cannot create or delete tasks.
2. PMs manage only projects they own; admins manage everything.
3. One-level subtasks; project progress includes subtasks.
4. Projects are archived, never deleted; task deletion soft-deletes subtasks with confirmation.
5. Members with open tasks cannot be removed until reassigned.
6. No self-registration or email; admins create users and reset passwords.
7. Attachments: 10 MB, allowlist, local private storage.
8. Due dates are calendar dates; reminders use each user's timezone.
9. Light theme only for Phase 0.
10. Single app instance; SQLite and in-process jobs.
11. The workspace will be initialized as a git repository (currently it is not one).
12. TypeScript stays on 6.x until SvelteKit/svelte-check support TypeScript 7.

---

## 23. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| SQLite write contention | WAL, single instance, short transactions, `busy_timeout` |
| Scope creep | Enforce §21 out-of-scope list; no extra fields/features |
| Permission drift | Central permission helper + full matrix tests + server-side checks |
| CSRF issues behind proxy | Set `ORIGIN` correctly; test cross-origin POST rejection |
| Kanban drag-and-drop accessibility | "Move to…" menu + status select fallback; keyboard tests |
| Duplicate deadline notifications | Unique `(user_id, dedupe_key)` index; job tests |
| Timezone bugs | Calendar-date fields, per-user IANA timezone, shared `Intl` formatter |
| Upload abuse | Size limit, magic-byte validation, private path, authenticated download |
| Backup restore failure | Documented restore drill; DB + uploads backed up together |
| Activity table growth | Indexed pagination; retention policy deferred |
| Dev HMR duplicate DB/timers | `globalThis` guards; skip jobs when building |
| SvelteKit major-version API changes | Pin versions; use stable features (no experimental remote functions) |
| `#lib` imports fail to resolve | Use explicit extensions for TS modules (`#lib/types.ts`, `#lib/server/db/index.ts`); covered by `svelte-check` |
| `bits-ui`/`runed` stale SvelteKit peer | Verified install/build; re-check when adding shadcn-svelte components |

---

## 24. Definition of Done

Phase 0 is complete when:

1. `pnpm svelte-check`, `pnpm lint`, and `pnpm test` pass.
2. `pnpm build` succeeds with adapter-node.
3. A fresh install runs migrations, seeds roles, and creates the first admin.
4. All 12 spec §7 criteria pass a manual acceptance run.
5. Playwright smoke flows pass.
6. Backup and restore procedures are documented and tested once.
7. README covers setup, env vars, migrations, seeding, production run, proxy headers, and backups.
