-- BeeProjects Phase 0 initial schema.
-- All tables are STRICT; timestamps are UTC ISO strings and calendar dates are YYYY-MM-DD.

CREATE TABLE roles (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	description TEXT NOT NULL
) STRICT;

CREATE TABLE users (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL COLLATE NOCASE UNIQUE,
	password_hash TEXT NOT NULL,
	role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
	timezone TEXT NOT NULL DEFAULT 'UTC',
	is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
	must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
	last_login_at TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE sessions (
	token_hash TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL,
	last_seen_at TEXT NOT NULL,
	ip TEXT,
	user_agent TEXT
) STRICT;

CREATE TABLE projects (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	start_date TEXT,
	due_date TEXT,
	priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
	status TEXT NOT NULL CHECK (status IN ('Planning', 'Active', 'On Hold', 'Completed', 'Archived')),
	created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE project_members (
	project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	added_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	added_at TEXT NOT NULL,
	PRIMARY KEY (project_id, user_id)
) STRICT;

CREATE TABLE tasks (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	parent_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
	title TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
	status TEXT NOT NULL CHECK (status IN ('Backlog', 'To Do', 'In Progress', 'Review', 'Done')),
	start_date TEXT,
	due_date TEXT,
	completed_at TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	deleted_at TEXT
) STRICT;

CREATE TABLE task_assignees (
	task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	assigned_at TEXT NOT NULL,
	PRIMARY KEY (task_id, user_id)
) STRICT;

CREATE TABLE task_comments (
	id TEXT PRIMARY KEY,
	task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
	author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	body TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	deleted_at TEXT
) STRICT;

CREATE TABLE task_attachments (
	id TEXT PRIMARY KEY,
	task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
	uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	original_name TEXT NOT NULL,
	stored_name TEXT NOT NULL,
	mime_type TEXT NOT NULL,
	size_bytes INTEGER NOT NULL,
	created_at TEXT NOT NULL,
	deleted_at TEXT
) STRICT;

CREATE TABLE activities (
	id TEXT PRIMARY KEY,
	entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'task')),
	entity_id TEXT NOT NULL,
	actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	action TEXT NOT NULL,
	field TEXT,
	old_value TEXT,
	new_value TEXT,
	metadata TEXT,
	created_at TEXT NOT NULL
) STRICT;

CREATE TABLE notifications (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	type TEXT NOT NULL CHECK (
		type IN ('task_assigned', 'task_reassigned', 'comment_added', 'mention', 'due_soon', 'overdue')
	),
	title TEXT NOT NULL,
	body TEXT,
	project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
	task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
	comment_id TEXT REFERENCES task_comments(id) ON DELETE CASCADE,
	actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
	is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
	dedupe_key TEXT,
	created_at TEXT NOT NULL,
	read_at TEXT,
	UNIQUE (user_id, dedupe_key)
) STRICT;

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status_owner ON projects(status, owner_id);

CREATE INDEX idx_project_members_user ON project_members(user_id);

CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_deleted ON tasks(deleted_at);

CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);

CREATE INDEX idx_task_comments_task_created ON task_comments(task_id, created_at);

CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);

CREATE INDEX idx_activities_entity_created ON activities(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activities_actor_created ON activities(actor_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread_created
	ON notifications(user_id, is_read, created_at DESC);

INSERT OR IGNORE INTO roles (id, name, description) VALUES
	(1, 'admin', 'Full system access'),
	(2, 'project_manager', 'Creates and manages owned projects'),
	(3, 'member', 'Works on assigned tasks');
