import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
	MemberCandidate,
	ProjectMember,
	ProjectOwnerOption,
	ProjectPriority,
	ProjectStatus,
	ProjectSummary,
	PublicUser
} from '#lib/types.ts';
import type { ProjectListQuery } from '#lib/schemas/projects.ts';
import { localDateISO } from '../dates.ts';
import { logActivity } from './activity.ts';

export interface ProjectListResult {
	projects: ProjectSummary[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface ProjectInput {
	name: string;
	description: string;
	startDate: string;
	dueDate: string;
	priority: ProjectPriority;
	status: ProjectStatus;
	ownerId?: string;
}

export type ProjectMemberErrorCode = 'owner' | 'open-tasks' | 'not-member' | 'inactive-user';

export class ProjectInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ProjectInputError';
	}
}

export class ProjectMemberError extends Error {
	constructor(
		public readonly code: ProjectMemberErrorCode,
		message: string,
		public readonly openTasks = 0
	) {
		super(message);
		this.name = 'ProjectMemberError';
	}
}

interface ProjectRow {
	id: string;
	name: string;
	description: string;
	owner_id: string;
	owner_name: string;
	start_date: string | null;
	due_date: string | null;
	priority: string;
	status: string;
	created_at: string;
	updated_at: string;
	member_count: number;
	total_tasks: number;
	completed_tasks: number;
	overdue_tasks: number;
}

interface ProjectRawRow {
	id: string;
	name: string;
	description: string;
	start_date: string | null;
	due_date: string | null;
	priority: string;
	status: string;
	owner_id: string;
}

const PROJECT_SELECT = `
	SELECT p.id, p.name, p.description, p.owner_id, o.name AS owner_name,
	       p.start_date, p.due_date, p.priority, p.status, p.created_at, p.updated_at,
	       (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
	       (SELECT COUNT(*) FROM tasks t
	        WHERE t.project_id = p.id AND t.deleted_at IS NULL) AS total_tasks,
	       (SELECT COUNT(*) FROM tasks t
	        WHERE t.project_id = p.id AND t.deleted_at IS NULL AND t.status = 'Done') AS completed_tasks,
	       (SELECT COUNT(*) FROM tasks t
	        WHERE t.project_id = p.id AND t.deleted_at IS NULL AND t.status <> 'Done'
	          AND t.due_date IS NOT NULL AND t.due_date < @today) AS overdue_tasks
	FROM projects p
	JOIN users o ON o.id = p.owner_id
`;

function progress(total: number, completed: number): number {
	return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function mapProject(row: ProjectRow): ProjectSummary {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		ownerId: row.owner_id,
		ownerName: row.owner_name,
		startDate: row.start_date,
		dueDate: row.due_date,
		priority: row.priority as ProjectPriority,
		status: row.status as ProjectStatus,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		memberCount: row.member_count,
		totalTasks: row.total_tasks,
		completedTasks: row.completed_tasks,
		overdueTasks: row.overdue_tasks,
		progress: progress(row.total_tasks, row.completed_tasks)
	};
}

function getRawProject(db: Database.Database, projectId: string): ProjectRawRow | null {
	const row = db
		.prepare(
			`SELECT id, name, description, start_date, due_date, priority, status, owner_id
			 FROM projects WHERE id = ?`
		)
		.get(projectId) as ProjectRawRow | undefined;

	return row ?? null;
}

function getActiveOwner(
	db: Database.Database,
	userId: string
): { id: string; name: string } | null {
	const row = db
		.prepare(
			`SELECT u.id, u.name
			 FROM users u
			 JOIN roles r ON r.id = u.role_id
			 WHERE u.id = ? AND u.is_active = 1
			   AND r.name IN ('admin', 'project_manager')`
		)
		.get(userId) as { id: string; name: string } | undefined;

	return row ?? null;
}

export function getProjectSummary(
	db: Database.Database,
	projectId: string,
	viewer: PublicUser
): ProjectSummary | null {
	const row = db
		.prepare(`${PROJECT_SELECT} WHERE p.id = @id`)
		.get({ id: projectId, today: localDateISO(viewer.timezone) }) as ProjectRow | undefined;

	return row ? mapProject(row) : null;
}

export function listProjects(
	db: Database.Database,
	viewer: PublicUser,
	filters: ProjectListQuery
): ProjectListResult {
	const conditions: string[] = [];
	const params: Record<string, string | number> = {};

	if (viewer.role !== 'admin') {
		conditions.push(
			'EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = @viewerId)'
		);
		params.viewerId = viewer.id;
	}

	if (filters.status === 'open') {
		conditions.push("p.status <> 'Archived'");
	} else if (filters.status !== 'all') {
		conditions.push('p.status = @status');
		params.status = filters.status;
	}

	if (filters.owner !== 'all') {
		conditions.push('p.owner_id = @owner');
		params.owner = filters.owner;
	}

	if (filters.q) {
		conditions.push('(p.name LIKE @q OR p.description LIKE @q)');
		params.q = `%${filters.q}%`;
	}

	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	const countStatement = db.prepare(`SELECT COUNT(*) AS count FROM projects p ${where}`);
	const countRow =
		Object.keys(params).length > 0
			? (countStatement.get(params) as { count: number })
			: (countStatement.get() as { count: number });

	const offset = (filters.page - 1) * filters.pageSize;
	const rows = db
		.prepare(
			`${PROJECT_SELECT} ${where}
			 ORDER BY p.updated_at DESC, p.name COLLATE NOCASE ASC
			 LIMIT @limit OFFSET @offset`
		)
		.all({
			...params,
			today: localDateISO(viewer.timezone),
			limit: filters.pageSize,
			offset
		}) as ProjectRow[];

	const total = countRow.count;

	return {
		projects: rows.map(mapProject),
		total,
		page: filters.page,
		pageSize: filters.pageSize,
		totalPages: Math.max(1, Math.ceil(total / filters.pageSize))
	};
}

export function listVisibleProjectOwners(
	db: Database.Database,
	viewer: PublicUser
): ProjectOwnerOption[] {
	const params: Record<string, string> = {};
	let visibility = '';

	if (viewer.role !== 'admin') {
		visibility =
			'WHERE EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = @viewerId)';
		params.viewerId = viewer.id;
	}

	const statement = db.prepare(
		`SELECT DISTINCT u.id, u.name
		 FROM projects p
		 JOIN users u ON u.id = p.owner_id
		 ${visibility}
		 ORDER BY u.name COLLATE NOCASE ASC`
	);

	const rows = (
		viewer.role === 'admin' ? statement.all() : statement.all(params)
	) as ProjectOwnerOption[];

	return rows;
}

export function getOwnerCandidates(db: Database.Database): ProjectOwnerOption[] {
	return db
		.prepare(
			`SELECT u.id, u.name
			 FROM users u
			 JOIN roles r ON r.id = u.role_id
			 WHERE u.is_active = 1 AND r.name IN ('admin', 'project_manager')
			 ORDER BY u.name COLLATE NOCASE ASC`
		)
		.all() as ProjectOwnerOption[];
}

export function createProject(
	db: Database.Database,
	input: ProjectInput,
	actor: PublicUser
): string {
	if (actor.role === 'member') {
		throw new ProjectInputError('Members cannot create projects.');
	}

	let ownerId = actor.id;

	if (actor.role === 'admin' && input.ownerId) {
		const owner = getActiveOwner(db, input.ownerId);

		if (!owner) {
			throw new ProjectInputError('Select an active admin or project manager as owner.');
		}

		ownerId = owner.id;
	} else if (input.ownerId && input.ownerId !== actor.id) {
		throw new ProjectInputError('Only admins can choose another project owner.');
	}

	const id = randomUUID();
	const now = new Date().toISOString();
	const startDate = input.startDate || null;
	const dueDate = input.dueDate || null;

	db.transaction(() => {
		db.prepare(
			`INSERT INTO projects
			 (id, name, description, owner_id, start_date, due_date, priority, status,
			  created_by, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			id,
			input.name.trim(),
			input.description.trim(),
			ownerId,
			startDate,
			dueDate,
			input.priority,
			input.status,
			actor.id,
			now,
			now
		);

		db.prepare(
			`INSERT INTO project_members (project_id, user_id, added_by, added_at)
			 VALUES (?, ?, ?, ?)`
		).run(id, ownerId, actor.id, now);

		logActivity(db, {
			entityType: 'project',
			entityId: id,
			actorId: actor.id,
			action: 'project.created',
			newValue: input.name.trim()
		});
	})();

	return id;
}

export function updateProject(
	db: Database.Database,
	projectId: string,
	input: ProjectInput,
	actor: PublicUser
): string[] {
	const existing = getRawProject(db, projectId);

	if (!existing) {
		throw new ProjectInputError('Project not found.');
	}

	const next = {
		name: input.name.trim(),
		description: input.description.trim(),
		start_date: input.startDate || null,
		due_date: input.dueDate || null,
		priority: input.priority,
		status: input.status
	};

	const fields: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

	for (const field of [
		'name',
		'description',
		'start_date',
		'due_date',
		'priority',
		'status'
	] as const) {
		const oldValue = existing[field] ?? null;
		const newValue = next[field] ?? null;

		if (oldValue !== newValue) {
			fields.push({ field, oldValue, newValue });
		}
	}

	if (fields.length === 0) return [];

	const now = new Date().toISOString();

	db.transaction(() => {
		db.prepare(
			`UPDATE projects
			 SET name = ?, description = ?, start_date = ?, due_date = ?,
			     priority = ?, status = ?, updated_at = ?
			 WHERE id = ?`
		).run(
			next.name,
			next.description,
			next.start_date,
			next.due_date,
			next.priority,
			next.status,
			now,
			projectId
		);

		for (const change of fields) {
			logActivity(db, {
				entityType: 'project',
				entityId: projectId,
				actorId: actor.id,
				action: 'project.updated',
				field: change.field,
				oldValue: change.oldValue,
				newValue: change.newValue
			});
		}
	})();

	return fields.map((change) => change.field);
}

export function archiveProject(
	db: Database.Database,
	projectId: string,
	actor: PublicUser
): boolean {
	const existing = getRawProject(db, projectId);

	if (!existing || existing.status === 'Archived') return false;

	const now = new Date().toISOString();

	db.transaction(() => {
		db.prepare("UPDATE projects SET status = 'Archived', updated_at = ? WHERE id = ?").run(
			now,
			projectId
		);
		logActivity(db, {
			entityType: 'project',
			entityId: projectId,
			actorId: actor.id,
			action: 'project.archived',
			oldValue: existing.status,
			newValue: 'Archived'
		});
	})();

	return true;
}

export function unarchiveProject(
	db: Database.Database,
	projectId: string,
	actor: PublicUser
): boolean {
	const existing = getRawProject(db, projectId);

	if (!existing || existing.status !== 'Archived') return false;

	const now = new Date().toISOString();

	db.transaction(() => {
		db.prepare("UPDATE projects SET status = 'Planning', updated_at = ? WHERE id = ?").run(
			now,
			projectId
		);
		logActivity(db, {
			entityType: 'project',
			entityId: projectId,
			actorId: actor.id,
			action: 'project.unarchived',
			oldValue: 'Archived',
			newValue: 'Planning'
		});
	})();

	return true;
}

export function reassignProjectOwner(
	db: Database.Database,
	projectId: string,
	newOwnerId: string,
	actor: PublicUser
): boolean {
	const existing = getRawProject(db, projectId);

	if (!existing) {
		throw new ProjectInputError('Project not found.');
	}

	if (existing.owner_id === newOwnerId) return false;

	const owner = getActiveOwner(db, newOwnerId);

	if (!owner) {
		throw new ProjectInputError('Select an active admin or project manager as owner.');
	}

	const previousOwner = db.prepare('SELECT name FROM users WHERE id = ?').get(existing.owner_id) as
		{ name: string } | undefined;

	const now = new Date().toISOString();

	db.transaction(() => {
		db.prepare('UPDATE projects SET owner_id = ?, updated_at = ? WHERE id = ?').run(
			newOwnerId,
			now,
			projectId
		);

		db.prepare(
			`INSERT OR IGNORE INTO project_members (project_id, user_id, added_by, added_at)
			 VALUES (?, ?, ?, ?)`
		).run(projectId, newOwnerId, actor.id, now);

		logActivity(db, {
			entityType: 'project',
			entityId: projectId,
			actorId: actor.id,
			action: 'project.owner_changed',
			field: 'owner',
			oldValue: previousOwner?.name ?? null,
			newValue: owner.name,
			metadata: { previousOwnerId: existing.owner_id, newOwnerId }
		});
	})();

	return true;
}

export function listProjectMembers(db: Database.Database, projectId: string): ProjectMember[] {
	const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId) as
		{ owner_id: string } | undefined;

	if (!project) return [];

	const rows = db
		.prepare(
			`SELECT u.id, u.name, u.email, r.name AS role, u.is_active, pm.added_at,
			        (SELECT COUNT(*) FROM task_assignees ta
			         JOIN tasks t ON t.id = ta.task_id
			         WHERE ta.user_id = u.id AND t.project_id = @projectId
			           AND t.deleted_at IS NULL AND t.status <> 'Done') AS open_tasks
			 FROM project_members pm
			 JOIN users u ON u.id = pm.user_id
			 JOIN roles r ON r.id = u.role_id
			 WHERE pm.project_id = @projectId
			 ORDER BY (u.id = @ownerId) DESC, u.name COLLATE NOCASE ASC`
		)
		.all({ projectId, ownerId: project.owner_id }) as Array<{
		id: string;
		name: string;
		email: string;
		role: string;
		is_active: number;
		added_at: string;
		open_tasks: number;
	}>;

	return rows.map((row) => ({
		userId: row.id,
		name: row.name,
		email: row.email,
		role: row.role as ProjectMember['role'],
		isActive: row.is_active === 1,
		isOwner: row.id === project.owner_id,
		openTasks: row.open_tasks,
		addedAt: row.added_at
	}));
}

export function listMemberCandidates(db: Database.Database, projectId: string): MemberCandidate[] {
	return db
		.prepare(
			`SELECT u.id, u.name, u.email, r.name AS role
			 FROM users u
			 JOIN roles r ON r.id = u.role_id
			 WHERE u.is_active = 1
			   AND NOT EXISTS (
			       SELECT 1 FROM project_members pm
			       WHERE pm.project_id = ? AND pm.user_id = u.id
			   )
			 ORDER BY u.name COLLATE NOCASE ASC`
		)
		.all(projectId) as MemberCandidate[];
}

export function addProjectMember(
	db: Database.Database,
	projectId: string,
	userId: string,
	actor: PublicUser
): boolean {
	const member = db
		.prepare(
			`SELECT u.id, u.name
			 FROM users u
			 WHERE u.id = ? AND u.is_active = 1`
		)
		.get(userId) as { id: string; name: string } | undefined;

	if (!member) {
		throw new ProjectMemberError('inactive-user', 'Select an active user.');
	}

	const now = new Date().toISOString();
	const result = db
		.prepare(
			`INSERT OR IGNORE INTO project_members (project_id, user_id, added_by, added_at)
			 VALUES (?, ?, ?, ?)`
		)
		.run(projectId, userId, actor.id, now);

	if (result.changes === 0) return false;

	logActivity(db, {
		entityType: 'project',
		entityId: projectId,
		actorId: actor.id,
		action: 'project.member_added',
		newValue: member.name,
		metadata: { userId }
	});

	return true;
}

export function removeProjectMember(
	db: Database.Database,
	projectId: string,
	userId: string,
	actor: PublicUser
): void {
	const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId) as
		{ owner_id: string } | undefined;

	if (!project) {
		throw new ProjectMemberError('not-member', 'Project not found.');
	}

	if (project.owner_id === userId) {
		throw new ProjectMemberError('owner', 'The project owner cannot be removed.');
	}

	const member = db
		.prepare(
			`SELECT u.name
			 FROM project_members pm
			 JOIN users u ON u.id = pm.user_id
			 WHERE pm.project_id = ? AND pm.user_id = ?`
		)
		.get(projectId, userId) as { name: string } | undefined;

	if (!member) {
		throw new ProjectMemberError('not-member', 'This user is not a project member.');
	}

	const openTasks = (
		db
			.prepare(
				`SELECT COUNT(*) AS count
				 FROM task_assignees ta
				 JOIN tasks t ON t.id = ta.task_id
				 WHERE ta.user_id = ? AND t.project_id = ?
				   AND t.deleted_at IS NULL AND t.status <> 'Done'`
			)
			.get(userId, projectId) as { count: number }
	).count;

	if (openTasks > 0) {
		throw new ProjectMemberError(
			'open-tasks',
			'Reassign this member’s open tasks before removing them.',
			openTasks
		);
	}

	db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(
		projectId,
		userId
	);

	logActivity(db, {
		entityType: 'project',
		entityId: projectId,
		actorId: actor.id,
		action: 'project.member_removed',
		oldValue: member.name,
		metadata: { userId }
	});
}
