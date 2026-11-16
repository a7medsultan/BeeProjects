import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
	PublicUser,
	TaskAssignee,
	TaskListItem,
	TaskPermissions,
	TaskPriority,
	TaskStatus
} from '#lib/types.ts';
import type { TaskListQuery } from '#lib/schemas/tasks.ts';
import type { ProjectAccess } from '../permissions.ts';
import { getProjectAccess } from '../permissions.ts';
import { addDaysISO, localDateISO } from '../dates.ts';
import { logActivity } from './activity.ts';

export interface TaskListResult {
	tasks: TaskListItem[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface TaskDetailResult {
	task: TaskListItem;
	projectAccess: ProjectAccess;
	permissions: TaskPermissions;
}

export interface TaskInput {
	title: string;
	description: string;
	priority: TaskPriority;
	status: TaskStatus;
	startDate: string;
	dueDate: string;
	assigneeIds: string[];
	parentTaskId?: string;
}

export class TaskInputError extends Error {
	constructor(
		message: string,
		public readonly field: 'assigneeIds' | 'parentTaskId' | 'general' = 'general'
	) {
		super(message);
		this.name = 'TaskInputError';
	}
}

interface TaskRow {
	id: string;
	project_id: string;
	project_name: string;
	parent_task_id: string | null;
	parent_title: string | null;
	title: string;
	description: string;
	priority: string;
	status: string;
	start_date: string | null;
	due_date: string | null;
	completed_at: string | null;
	created_by: string;
	created_by_name: string;
	created_at: string;
	updated_at: string;
	subtask_count: number;
	completed_subtask_count: number;
	is_overdue: number;
}

interface TaskRawRow {
	id: string;
	project_id: string;
	title: string;
	description: string;
	priority: string;
	status: string;
	start_date: string | null;
	due_date: string | null;
	completed_at: string | null;
	parent_task_id: string | null;
	created_by: string;
}

interface AssigneeRow {
	task_id: string;
	user_id: string;
	name: string;
	email: string;
	is_active: number;
}

const TASK_SELECT = `
	SELECT t.id, t.project_id, p.name AS project_name,
	       t.parent_task_id, pt.title AS parent_title,
	       t.title, t.description, t.priority, t.status, t.start_date, t.due_date,
	       t.completed_at, t.created_by, cu.name AS created_by_name,
	       t.created_at, t.updated_at,
	       (SELECT COUNT(*) FROM tasks st
	        WHERE st.parent_task_id = t.id AND st.deleted_at IS NULL) AS subtask_count,
	       (SELECT COUNT(*) FROM tasks st
	        WHERE st.parent_task_id = t.id AND st.deleted_at IS NULL
	          AND st.status = 'Done') AS completed_subtask_count,
	       CASE WHEN t.due_date IS NOT NULL AND t.status <> 'Done' AND t.due_date < @today
	            THEN 1 ELSE 0 END AS is_overdue
	FROM tasks t
	JOIN projects p ON p.id = t.project_id
	JOIN users cu ON cu.id = t.created_by
	LEFT JOIN tasks pt ON pt.id = t.parent_task_id
	WHERE t.deleted_at IS NULL
`;

function mapTask(row: TaskRow): TaskListItem {
	return {
		id: row.id,
		projectId: row.project_id,
		projectName: row.project_name,
		parentTaskId: row.parent_task_id,
		parentTitle: row.parent_title,
		title: row.title,
		description: row.description,
		priority: row.priority as TaskPriority,
		status: row.status as TaskStatus,
		startDate: row.start_date,
		dueDate: row.due_date,
		completedAt: row.completed_at,
		createdById: row.created_by,
		createdByName: row.created_by_name,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		assignees: [],
		subtaskCount: row.subtask_count,
		completedSubtaskCount: row.completed_subtask_count,
		isOverdue: row.is_overdue === 1
	};
}

function fetchAssignees(db: Database.Database, taskIds: string[]): Map<string, TaskAssignee[]> {
	const result = new Map<string, TaskAssignee[]>();

	if (taskIds.length === 0) return result;

	const placeholders = taskIds.map(() => '?').join(', ');
	const rows = db
		.prepare(
			`SELECT ta.task_id, u.id AS user_id, u.name, u.email, u.is_active
			 FROM task_assignees ta
			 JOIN users u ON u.id = ta.user_id
			 WHERE ta.task_id IN (${placeholders})
			 ORDER BY u.name COLLATE NOCASE ASC`
		)
		.all(...taskIds) as AssigneeRow[];

	for (const row of rows) {
		const assignees = result.get(row.task_id) ?? [];
		assignees.push({
			userId: row.user_id,
			name: row.name,
			email: row.email,
			isActive: row.is_active === 1
		});
		result.set(row.task_id, assignees);
	}

	return result;
}

function attachAssignees(db: Database.Database, tasks: TaskListItem[]): TaskListItem[] {
	const byTask = fetchAssignees(
		db,
		tasks.map((task) => task.id)
	);

	for (const task of tasks) {
		task.assignees = byTask.get(task.id) ?? [];
	}

	return tasks;
}

function getRawTask(db: Database.Database, taskId: string): TaskRawRow | null {
	const row = db
		.prepare(
			`SELECT id, project_id, title, description, priority, status,
			        start_date, due_date, completed_at, parent_task_id, created_by
			 FROM tasks
			 WHERE id = ? AND deleted_at IS NULL`
		)
		.get(taskId) as TaskRawRow | undefined;

	return row ?? null;
}

function validateAssignees(
	db: Database.Database,
	projectId: string,
	assigneeIds: string[],
	allowedCurrentIds: Set<string> = new Set()
): Map<string, string> {
	const ids = [...new Set(assigneeIds.filter(Boolean))];
	const result = new Map<string, string>();

	if (ids.length === 0) return result;

	const placeholders = ids.map(() => '?').join(', ');
	const rows = db
		.prepare(
			`SELECT u.id, u.name
			 FROM users u
			 JOIN project_members pm ON pm.user_id = u.id
			 WHERE pm.project_id = ? AND u.is_active = 1
			   AND u.id IN (${placeholders})`
		)
		.all(projectId, ...ids) as Array<{ id: string; name: string }>;

	for (const row of rows) result.set(row.id, row.name);

	const allowedMissing = ids.filter((id) => !result.has(id) && allowedCurrentIds.has(id));

	if (allowedMissing.length > 0) {
		const missingPlaceholders = allowedMissing.map(() => '?').join(', ');
		const existing = db
			.prepare(`SELECT id, name FROM users WHERE id IN (${missingPlaceholders})`)
			.all(...allowedMissing) as Array<{ id: string; name: string }>;

		for (const row of existing) result.set(row.id, row.name);
	}

	if (ids.some((id) => !result.has(id))) {
		throw new TaskInputError('Assignees must be active members of this project.', 'assigneeIds');
	}

	return result;
}

export function getTaskPermissions(
	access: ProjectAccess,
	task: TaskListItem,
	userId: string
): TaskPermissions {
	const isAssignee = task.assignees.some((assignee) => assignee.userId === userId);
	const canManage = access.canManage;

	return {
		canEdit: canManage || (isAssignee && !access.isArchived),
		canManageAssignees: canManage,
		canDelete: canManage,
		canCreateSubtask: canManage && task.parentTaskId === null,
		isAssignee
	};
}

export function listProjectTasks(
	db: Database.Database,
	projectId: string,
	viewer: PublicUser,
	filters: TaskListQuery
): TaskListResult {
	const today = localDateISO(viewer.timezone);
	const weekEnd = addDaysISO(today, 7);

	const conditions = ['t.project_id = @projectId', 't.deleted_at IS NULL'];
	const params: Record<string, string | number> = { projectId };

	if (filters.q) {
		conditions.push('(t.title LIKE @q OR t.description LIKE @q)');
		params.q = `%${filters.q}%`;
	}

	if (filters.status !== 'all') {
		conditions.push('t.status = @status');
		params.status = filters.status;
	}

	if (filters.priority !== 'all') {
		conditions.push('t.priority = @priority');
		params.priority = filters.priority;
	}

	if (filters.assignee !== 'all') {
		conditions.push(
			'EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = @assignee)'
		);
		params.assignee = filters.assignee;
	}

	if (filters.due === 'overdue') {
		conditions.push("t.due_date IS NOT NULL AND t.due_date < @today AND t.status <> 'Done'");
	} else if (filters.due === 'today') {
		conditions.push('t.due_date = @today');
	} else if (filters.due === 'week') {
		conditions.push(
			"t.due_date IS NOT NULL AND t.due_date >= @today AND t.due_date <= @weekEnd AND t.status <> 'Done'"
		);
	}

	const where = conditions.join(' AND ');

	const total = (
		db
			.prepare(`SELECT COUNT(*) AS count FROM tasks t WHERE ${where}`)
			.get({ ...params, today, weekEnd }) as { count: number }
	).count;

	let orderBy: string;

	if (filters.sort === 'due_date') {
		orderBy = `(t.due_date IS NULL) ASC, t.due_date ${filters.dir.toUpperCase()}, t.created_at DESC`;
	} else if (filters.sort === 'priority') {
		orderBy = `CASE t.priority
			WHEN 'Urgent' THEN 4 WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END
			${filters.dir.toUpperCase()}, t.created_at DESC`;
	} else {
		orderBy = `t.created_at ${filters.dir.toUpperCase()}`;
	}

	const offset = (filters.page - 1) * filters.pageSize;
	const rows = db
		.prepare(
			`${TASK_SELECT} AND ${where}
			 ORDER BY ${orderBy}
			 LIMIT @limit OFFSET @offset`
		)
		.all({
			...params,
			today,
			weekEnd,
			limit: filters.pageSize,
			offset
		}) as TaskRow[];

	const tasks = attachAssignees(db, rows.map(mapTask));

	return {
		tasks,
		total,
		page: filters.page,
		pageSize: filters.pageSize,
		totalPages: Math.max(1, Math.ceil(total / filters.pageSize))
	};
}

export function getTaskDetail(
	db: Database.Database,
	taskId: string,
	viewer: PublicUser
): TaskDetailResult | null {
	const row = db
		.prepare(`${TASK_SELECT} AND t.id = @id`)
		.get({ id: taskId, today: localDateISO(viewer.timezone) }) as TaskRow | undefined;

	if (!row) return null;

	const access = getProjectAccess(db, row.project_id, viewer);

	if (!access) return null;

	const task = attachAssignees(db, [mapTask(row)])[0];

	return {
		task,
		projectAccess: access,
		permissions: getTaskPermissions(access, task, viewer.id)
	};
}

export function listSubtasks(
	db: Database.Database,
	taskId: string,
	viewer: PublicUser
): TaskListItem[] {
	const rows = db
		.prepare(
			`${TASK_SELECT} AND t.parent_task_id = @id
			 ORDER BY t.created_at ASC`
		)
		.all({ id: taskId, today: localDateISO(viewer.timezone) }) as TaskRow[];

	return attachAssignees(db, rows.map(mapTask));
}

export function getTopLevelTaskForCreate(
	db: Database.Database,
	projectId: string,
	taskId: string
): { id: string; title: string } | null {
	const row = db
		.prepare(
			`SELECT id, title
			 FROM tasks
			 WHERE id = ? AND project_id = ? AND deleted_at IS NULL AND parent_task_id IS NULL`
		)
		.get(taskId, projectId) as { id: string; title: string } | undefined;

	return row ?? null;
}

export function createTask(
	db: Database.Database,
	projectId: string,
	input: TaskInput,
	actor: PublicUser
): string {
	const assignees = validateAssignees(db, projectId, input.assigneeIds);
	let parentTaskId: string | null = null;

	if (input.parentTaskId) {
		const parent = getTopLevelTaskForCreate(db, projectId, input.parentTaskId);

		if (!parent) {
			throw new TaskInputError(
				'Subtasks can only be added to a top-level task in this project.',
				'parentTaskId'
			);
		}

		parentTaskId = parent.id;
	}

	const id = randomUUID();
	const now = new Date().toISOString();
	const startDate = input.startDate || null;
	const dueDate = input.dueDate || null;
	const completedAt = input.status === 'Done' ? now : null;

	db.transaction(() => {
		db.prepare(
			`INSERT INTO tasks
			 (id, project_id, parent_task_id, title, description, created_by, priority, status,
			  start_date, due_date, completed_at, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			id,
			projectId,
			parentTaskId,
			input.title.trim(),
			input.description.trim(),
			actor.id,
			input.priority,
			input.status,
			startDate,
			dueDate,
			completedAt,
			now,
			now
		);

		const insertAssignee = db.prepare(
			`INSERT INTO task_assignees (task_id, user_id, assigned_by, assigned_at)
			 VALUES (?, ?, ?, ?)`
		);

		for (const userId of assignees.keys()) {
			insertAssignee.run(id, userId, actor.id, now);
		}

		logActivity(db, {
			entityType: 'task',
			entityId: id,
			actorId: actor.id,
			action: 'task.created',
			newValue: input.title.trim()
		});

		for (const [userId, name] of assignees) {
			logActivity(db, {
				entityType: 'task',
				entityId: id,
				actorId: actor.id,
				action: 'task.assignee_added',
				newValue: name,
				metadata: { userId }
			});
		}
	})();

	return id;
}

export function updateTask(
	db: Database.Database,
	taskId: string,
	input: TaskInput,
	actor: PublicUser,
	access: ProjectAccess
): string[] {
	const existing = getRawTask(db, taskId);

	if (!existing) {
		throw new TaskInputError('Task not found.');
	}

	const next = {
		title: input.title.trim(),
		description: input.description.trim(),
		priority: input.priority,
		start_date: input.startDate || null,
		due_date: input.dueDate || null,
		status: input.status
	};

	const changes: string[] = [];
	const now = new Date().toISOString();
	let completedAt = existing.completed_at;

	if (next.status === 'Done' && existing.status !== 'Done') {
		completedAt = now;
	} else if (next.status !== 'Done' && existing.status === 'Done') {
		completedAt = null;
	}

	const fieldChanges: Array<{ field: string; oldValue: string | null; newValue: string | null }> =
		[];

	for (const field of ['title', 'description', 'priority', 'start_date', 'due_date'] as const) {
		const oldValue = existing[field] ?? null;
		const newValue = next[field] ?? null;

		if (oldValue !== newValue) {
			fieldChanges.push({ field, oldValue, newValue });
			changes.push(field);
		}
	}

	const statusChanged = existing.status !== next.status;
	if (statusChanged) changes.push('status');

	let assigneesToAdd: Map<string, string> | null = null;
	let assigneesToRemove: string[] = [];

	if (access.canManage) {
		const currentAssigneeIds = (
			db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?').all(taskId) as Array<{
				user_id: string;
			}>
		).map((row) => row.user_id);

		const nextAssigneeIds = [...new Set(input.assigneeIds.filter(Boolean))];
		assigneesToAdd = validateAssignees(
			db,
			existing.project_id,
			nextAssigneeIds,
			new Set(currentAssigneeIds)
		);

		const nextSet = new Set(nextAssigneeIds);
		assigneesToRemove = currentAssigneeIds.filter((id) => !nextSet.has(id));
		const currentSet = new Set(currentAssigneeIds);
		assigneesToAdd = new Map([...assigneesToAdd].filter(([userId]) => !currentSet.has(userId)));

		if (assigneesToAdd.size > 0 || assigneesToRemove.length > 0) {
			changes.push('assignees');
		}
	}

	if (changes.length === 0) return [];

	db.transaction(() => {
		db.prepare(
			`UPDATE tasks
			 SET title = ?, description = ?, priority = ?, status = ?,
			     start_date = ?, due_date = ?, completed_at = ?, updated_at = ?
			 WHERE id = ?`
		).run(
			next.title,
			next.description,
			next.priority,
			next.status,
			next.start_date,
			next.due_date,
			completedAt,
			now,
			taskId
		);

		for (const change of fieldChanges) {
			logActivity(db, {
				entityType: 'task',
				entityId: taskId,
				actorId: actor.id,
				action: 'task.updated',
				field: change.field,
				oldValue: change.oldValue,
				newValue: change.newValue
			});
		}

		if (statusChanged) {
			logActivity(db, {
				entityType: 'task',
				entityId: taskId,
				actorId: actor.id,
				action: 'task.status_changed',
				oldValue: existing.status,
				newValue: next.status
			});
		}

		if (assigneesToAdd) {
			const insert = db.prepare(
				`INSERT OR IGNORE INTO task_assignees (task_id, user_id, assigned_by, assigned_at)
				 VALUES (?, ?, ?, ?)`
			);

			for (const [userId, name] of assigneesToAdd) {
				insert.run(taskId, userId, actor.id, now);
				logActivity(db, {
					entityType: 'task',
					entityId: taskId,
					actorId: actor.id,
					action: 'task.assignee_added',
					newValue: name,
					metadata: { userId }
				});
			}
		}

		for (const userId of assigneesToRemove) {
			const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as
				{ name: string } | undefined;

			db.prepare('DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?').run(
				taskId,
				userId
			);

			logActivity(db, {
				entityType: 'task',
				entityId: taskId,
				actorId: actor.id,
				action: 'task.assignee_removed',
				oldValue: user?.name ?? null,
				metadata: { userId }
			});
		}
	})();

	return changes;
}

export function deleteTask(
	db: Database.Database,
	taskId: string,
	actor: PublicUser
): string | null {
	const existing = getRawTask(db, taskId);

	if (!existing) return null;

	const now = new Date().toISOString();
	const subtaskCount = (
		db
			.prepare(
				'SELECT COUNT(*) AS count FROM tasks WHERE parent_task_id = ? AND deleted_at IS NULL'
			)
			.get(taskId) as { count: number }
	).count;

	db.transaction(() => {
		db.prepare(
			`UPDATE tasks
			 SET deleted_at = ?, updated_at = ?
			 WHERE deleted_at IS NULL AND (id = ? OR parent_task_id = ?)`
		).run(now, now, taskId, taskId);

		logActivity(db, {
			entityType: 'task',
			entityId: taskId,
			actorId: actor.id,
			action: 'task.deleted',
			oldValue: existing.title,
			metadata: { subtaskCount }
		});
	})();

	return existing.project_id;
}
