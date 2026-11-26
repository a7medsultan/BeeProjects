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

Server helpers:

| Script                         | Purpose                                                             |
| ------------------------------ | ------------------------------------------------------------------- |
| `scripts/backup.sh`            | Back up SQLite and attachments with retention                       |
| `scripts/subdomain-manager.sh` | Add or delete Apache virtual hosts, with optional Let's Encrypt TLS |

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

For a complete Ubuntu VPS deployment with Node, systemd, a reverse proxy, TLS,
updates, and scheduled backups, see the VPS section below.

## Deploy on a VPS (Ubuntu + systemd)

These instructions assume:

- Ubuntu 24.04 LTS (22.04 also works)
- A domain such as `projects.example.com` with an A/AAAA record pointing at the VPS
- SSH access with a sudo-capable user
- App directory `/srv/beeprojects`
- One app instance (SQLite and the in-process jobs assume a single writer)

The examples use `/srv/beeprojects`; replace it with `/opt/BeeProjects` if that
is where you installed the app. If Apache already owns ports 80/443, skip Caddy
and use the [Apache subdomain manager](#apache-subdomains-optional) instead.

### 1. DNS and firewall

Create the DNS record first, then allow only SSH and HTTP(S):

```bash
sudo apt update
sudo apt install -y curl git build-essential python3 sqlite3 ufw

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Install Caddy only if you use the Caddy proxy in step 7:

```bash
sudo apt install -y caddy
```

If Apache already owns ports 80/443, do not install Caddy. Install Certbot for
the Apache subdomain manager instead:

```bash
sudo apt install -y apache2 certbot python3-certbot-apache
```

Do **not** expose port 3000 publicly. The app binds to `127.0.0.1` and the
reverse proxy forwards requests to it.

### 2. Install Node.js and pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version        # must be >= 22.17
sudo npm install -g pnpm@9.12.0
pnpm --version
```

`build-essential` and `python3` are needed if `better-sqlite3` cannot use a
prebuilt binary.

### 3. Create the service user and app directory

```bash
sudo useradd --system --create-home --home-dir /srv/beeprojects \
  --shell /usr/sbin/nologin beeprojects

sudo -u beeprojects git clone <YOUR_REPOSITORY_URL> /srv/beeprojects
```

If the repository is private, add a deploy key for the `beeprojects` user or
copy the app over SSH with `rsync`:

```bash
sudo rsync -a --exclude node_modules --exclude .svelte-kit --exclude build \
  --exclude data --exclude storage --exclude .env ./ /srv/beeprojects/
sudo chown -R beeprojects:beeprojects /srv/beeprojects
```

### 4. Configure production environment

```bash
sudo -u beeprojects cp /srv/beeprojects/.env.example /srv/beeprojects/.env
sudo -u beeprojects nano /srv/beeprojects/.env
sudo chmod 600 /srv/beeprojects/.env
sudo chown beeprojects:beeprojects /srv/beeprojects/.env
```

Set at least:

```dotenv
PORT=3000
HOST=127.0.0.1
ORIGIN=https://projects.example.com

DATABASE_PATH=./data/app.db
UPLOAD_DIR=./storage/attachments
BODY_SIZE_LIMIT=12M

SESSION_TTL_DAYS=30
JOBS_ENABLED=true

PROTOCOL_HEADER=x-forwarded-proto
HOST_HEADER=x-forwarded-host
ADDRESS_HEADER=x-forwarded-for
XFF_DEPTH=1

ADMIN_NAME=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

`ORIGIN` must exactly match the public URL, including the scheme and without a
trailing slash. `BODY_SIZE_LIMIT` is required for 10 MB attachments; the
adapter-node default is 512 KB.

### 5. Install, build, and seed

```bash
cd /srv/beeprojects

sudo -u beeprojects pnpm install --frozen-lockfile
sudo -u beeprojects pnpm build
sudo -u beeprojects pnpm db:seed
sudo -u beeprojects mkdir -p /srv/beeprojects/data \
  /srv/beeprojects/storage/attachments /srv/beeprojects/backups
```

`db:seed` applies migrations and creates the first admin. It only creates a user
when the users table is empty.

The app also runs migrations automatically on startup via the `init` hook.

### 6. Create the systemd service

Create `/etc/systemd/system/beeprojects.service`:

```ini
[Unit]
Description=BeeProjects
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=beeprojects
Group=beeprojects
WorkingDirectory=/srv/beeprojects
EnvironmentFile=/srv/beeprojects/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node build
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
UMask=0077

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/beeprojects/data /srv/beeprojects/storage

[Install]
WantedBy=multi-user.target
```

`ProtectSystem=strict` makes the app read-only except the two `ReadWritePaths`.
SQLite and uploads stay writable; the rest of the filesystem does not.

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now beeprojects
sudo systemctl status beeprojects
curl http://127.0.0.1:3000/health
```

If Node is not at `/usr/bin/node`, set `ExecStart` to the path from
`command -v node`.

### 7. Put a reverse proxy in front (Caddy or Apache)

If Apache already serves ports 80/443, for example for an existing PHP site, do
**not** install Caddy or nginx. Keep Apache and use the
[Apache subdomain manager](#apache-subdomains-optional) below. Running two web
servers on the same ports causes `bind: address already in use`.

The Caddy example in this step is for a server where nothing else owns ports
80/443. Replace `/etc/caddy/Caddyfile` with:

```caddyfile
projects.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
```

Then:

```bash
sudo caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
```

Caddy obtains and renews TLS automatically. It also forwards
`X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-For`, which match the
headers configured in `.env`.

Verify:

```bash
curl https://projects.example.com/health
```

Open the URL, sign in with the seeded admin, and change the password from the
profile page immediately. After the first login you can remove or replace
`ADMIN_PASSWORD` in `.env`; it is only used by seeding.

If you use nginx instead, set `client_max_body_size 12m;` and forward
`Host`, `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-For` to
`http://127.0.0.1:3000`.

If you already run Apache, use the subdomain manager instead of hand-writing
the vhost:

```bash
sudo ./scripts/subdomain-manager.sh add \
  --domain projects.example.com \
  --type proxy \
  --target http://127.0.0.1:3000 \
  --ssl \
  --email admin@example.com
```

See [Apache subdomains](#apache-subdomains-optional) for the full workflow and
safety behavior.

### 8. Deploying updates

```bash
cd /srv/beeprojects

sudo -u beeprojects ./scripts/backup.sh
sudo -u beeprojects git pull --ff-only
sudo -u beeprojects pnpm install --frozen-lockfile
sudo -u beeprojects pnpm build
sudo systemctl restart beeprojects

curl http://127.0.0.1:3000/health
```

Migrations run on startup. There is a brief restart window; this is acceptable
for a small team. Back up before every deploy.

Rollback:

1. Stop the service.
2. Restore the previous database and uploads using the backup procedure.
3. Check out the previous release commit.
4. Reinstall, rebuild, and restart.

### 9. Backups on the VPS

Run the backup script as the app user:

```bash
sudo -u beeprojects /srv/beeprojects/scripts/backup.sh
```

Schedule it with the service user's crontab:

```bash
sudo crontab -u beeprojects -e
```

```cron
15 2 * * * cd /srv/beeprojects && ./scripts/backup.sh >> /srv/beeprojects/backups/backup.log 2>&1
```

See the Backups section below for retention, restore steps, and offsite copies.

### 10. Logs and troubleshooting

```bash
sudo journalctl -u beeprojects -f
sudo journalctl -u apache2 -f   # Apache deployments
sudo journalctl -u caddy -f     # Caddy deployments only
curl http://127.0.0.1:3000/health
```

| Symptom                                          | Check                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `502 Bad Gateway`                                | Service running? `HOST`/`PORT` match the proxy target?                            |
| `Cross-site POST form submissions are forbidden` | `ORIGIN`, `PROTOCOL_HEADER`, `HOST_HEADER`                                        |
| `413` or large uploads rejected                  | `BODY_SIZE_LIMIT=12M` and proxy body limit (`client_max_body_size 12m` for nginx) |
| `database is locked`                             | More than one app instance is running                                             |
| Permission errors under `data/` or `storage/`    | Files must be owned by `beeprojects`                                              |
| Native module build failure                      | Install `build-essential python3`, then reinstall                                 |
| Login redirects loop                             | Cookie/TLS/proxy configuration; check `ORIGIN` and HTTPS                          |

### 11. VPS security checklist

- Use SSH keys; disable password SSH login.
- Keep UFW enabled and only expose 22/80/443.
- Never expose port 3000.
- Keep `.env` at mode `600` and never commit it.
- Change the seeded admin password immediately.
- Keep the OS and Node patched.
- Copy backups off the VPS (another host or object storage).
- Run a single instance; SQLite and in-process jobs are not multi-node.
- Consider fail2ban and automatic security updates for the SSH endpoint.

## Apache subdomains (optional)

`scripts/subdomain-manager.sh` creates and removes Apache virtual hosts on
Ubuntu/Debian. Use it when Apache already serves ports 80/443 instead of adding
Caddy or nginx.

Requirements:

- Apache 2.4 with `a2ensite`/`a2dissite`
- Root access (`sudo`)
- A DNS A/AAAA record pointing at the server
- `certbot` and `python3-certbot-apache` when using `--ssl`

```bash
sudo apt install -y apache2 certbot python3-certbot-apache
```

It supports two modes:

- **proxy** (default) - reverse-proxies the domain to the BeeProjects Node app
  at `http://127.0.0.1:3000`. The script never uses `/opt/BeeProjects` or the
  repository as a document root.
- **static** - serves a normal document root for a static site or PHP app.

Every config written by the script starts with
`# Managed by BeeProjects subdomain-manager`. Delete refuses to touch a vhost
without that marker unless `--force` is given.

### Usage

Run the script as root from the app directory. With no arguments it opens an
interactive menu:

```bash
cd /opt/BeeProjects
sudo ./scripts/subdomain-manager.sh
```

Add a BeeProjects reverse proxy with Let's Encrypt TLS:

```bash
sudo ./scripts/subdomain-manager.sh add \
  --domain projects.example.com \
  --type proxy \
  --target http://127.0.0.1:3000 \
  --ssl \
  --email admin@example.com
```

Add a static/PHP site:

```bash
sudo ./scripts/subdomain-manager.sh add \
  --domain blog.example.com \
  --type static \
  --docroot /var/www/blog.example.com/public_html \
  --ssl \
  --email admin@example.com
```

Add `--create-index` to create a placeholder `index.html` when the document
root does not exist. Use `--no-ssl` to stay on HTTP.

Delete a site:

```bash
sudo ./scripts/subdomain-manager.sh delete --domain projects.example.com
```

Delete without prompts, including certificate and logs:

```bash
sudo ./scripts/subdomain-manager.sh delete \
  --domain projects.example.com \
  --yes \
  --delete-cert \
  --delete-logs
```

The domain must be a subdomain FQDN with at least three labels, such as
`app.example.com`. Apex domains must be managed manually or by your hosting
panel.

### Options

| Option             | Command | Meaning                                                           |
| ------------------ | ------- | ----------------------------------------------------------------- |
| `--domain FQDN`    | add     | Domain to create                                                  |
| `--type TYPE`      | add     | `proxy` (default), `static`, or `php` (alias for `static`)        |
| `--target URL`     | add     | Loopback proxy target; default `http://127.0.0.1:3000`            |
| `--docroot PATH`   | add     | Static document root; default `/var/www/FQDN/public_html`         |
| `--email EMAIL`    | add     | Apache `ServerAdmin` and Certbot email                            |
| `--ssl`            | add     | Obtain or reuse a certificate and redirect HTTP to HTTPS          |
| `--no-ssl`         | add     | Configure HTTP only                                               |
| `--create-index`   | add     | Create a placeholder `index.html` in a static docroot             |
| `--domain FQDN`    | delete  | Domain to remove                                                  |
| `--force`          | delete  | Allow unmarked vhosts or a certificate shared by multiple domains |
| `--delete-cert`    | delete  | Delete the matching Let's Encrypt certificate                     |
| `--delete-logs`    | delete  | Delete `/var/log/apache2/FQDN`                                    |
| `--delete-docroot` | delete  | Delete the static docroot, restricted to paths under `/var/www`   |
| `-y`, `--yes`      | both    | Skip confirmation; optional delete cleanup defaults to "no"       |

### What add does

1. Verifies root access, Apache, the site directories, DNS, and conflicts.
2. Enables the required modules (`proxy`, `proxy_http`, `headers`, `ssl`,
   `socache_shmcb`, `rewrite`).
3. Writes `/etc/apache2/sites-available/<domain>.conf` with the marker.
4. Runs `a2ensite`, `apachectl configtest`, and reloads Apache.
5. With `--ssl`, runs `certbot certonly --apache`, writes its own
   `<domain>-le-ssl.conf` so the proxy directives cannot be lost, rewrites the
   HTTP vhost as a redirect, validates, and reloads again.
6. Rolls back the new vhost if validation or reload fails.

Proxy vhosts include `ProxyPreserveHost On`, `ProxyPass`/`ProxyPassReverse`,
`X-Forwarded-Host`, `X-Forwarded-Proto`, and a 12 MiB `LimitRequestBody`.

`certbot` renewals are handled by the system Certbot timer. The script uses
`certonly`, so it does not hand the SSL vhost to Certbot's installer.

### What delete does

1. Finds vhosts whose `ServerName` matches the domain.
2. Refuses unmarked configs unless `--force` is used.
3. Backs up every config to
   `/var/backups/beeprojects-subdomains/<domain>-delete-<timestamp>/`.
4. Disables and removes the configs, validates, and reloads Apache.
5. Restores the backup automatically if validation fails.
6. Optionally deletes the certificate, logs, and static docroot.

Deletion never removes `/opt/BeeProjects`, the SQLite database, uploads, or
unrelated vhosts. It also refuses to delete `/opt/BeeProjects` as a document
root and only deletes docroots under `/var/www` when explicitly requested. A
certificate that covers multiple domains is not deleted unless `--force` is
passed.

### App environment

After adding a proxy vhost, set the matching values in `/opt/BeeProjects/.env`
and restart the app:

```dotenv
ORIGIN=https://projects.example.com

PROTOCOL_HEADER=x-forwarded-proto
HOST_HEADER=x-forwarded-host
ADDRESS_HEADER=x-forwarded-for
XFF_DEPTH=1
BODY_SIZE_LIMIT=12M
```

`ORIGIN` must exactly match the public URL, including the scheme and without a
trailing slash. The script prints the expected values and health-check URL.

```bash
sudo systemctl restart beeprojects
curl http://127.0.0.1:3000/health
```

### Verify and troubleshoot

```bash
sudo apachectl configtest
sudo apachectl -S
curl -I https://projects.example.com
curl https://projects.example.com/health
sudo tail -f /var/log/apache2/projects.example.com/error.log
```

| Symptom                           | Check                                                                    |
| --------------------------------- | ------------------------------------------------------------------------ |
| `502 Bad Gateway`                 | `curl http://127.0.0.1:3000/health`, `systemctl status beeprojects`      |
| SSL issuance fails                | DNS A/AAAA record, port 80 reachable, `python3-certbot-apache` installed |
| `AH00526`/config test fails       | Run `sudo apachectl configtest` and read the reported file and line      |
| `403 Forbidden` on a static site  | Docroot permissions and the `<Directory>` block in the generated config  |
| Domain already configured         | Disable the existing vhost or use its current `ServerName`/`ServerAlias` |
| Caddy fails with `address in use` | Apache owns 80/443; stop/disable Caddy and use this script               |
| Upload returns `413`              | `BODY_SIZE_LIMIT=12M` and Apache `LimitRequestBody` (`MAX_BODY_BYTES`)   |

### Webmin

The generated files are normal Apache site configs, so they appear under
**Servers -> Apache Webserver**. Keep the marker line and the proxy directives
if you edit them in Webmin. If the panel manages a vhost itself, use the
panel's reverse-proxy feature instead and set the target to
`http://127.0.0.1:3000`.

### Backups and restore

Every delete writes a timestamped directory under
`/var/backups/beeprojects-subdomains/`. It contains the original config files
and `manifest.tsv`, which maps backup names back to their original paths.

To restore one manually:

```bash
sudo cp /var/backups/beeprojects-subdomains/<domain>-delete-<timestamp>/001-<domain>.conf \
  /etc/apache2/sites-available/<domain>.conf
sudo a2ensite <domain>
sudo apachectl configtest
sudo systemctl reload apache2
```

The script also writes an HTTP-config backup during SSL setup. Backups are
kept indefinitely; remove old directories when you no longer need them.

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
