import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { ActivityItem } from '#lib/types.ts';

export interface LogActivityInput {
	entityType: 'project' | 'task';
	entityId: string;
	actorId: string;
	action: string;
	field?: string | null;
	oldValue?: string | null;
	newValue?: string | null;
	metadata?: Record<string, unknown> | null;
}

export interface ActivityPage {
	items: ActivityItem[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

interface ActivityRow {
	id: string;
	actor_id: string;
	actor_name: string;
	action: string;
	field: string | null;
	old_value: string | null;
	new_value: string | null;
	metadata: string | null;
	created_at: string;
}

const ACTIVITY_SELECT = `
	SELECT a.id, a.actor_id, u.name AS actor_name, a.action, a.field,
	       a.old_value, a.new_value, a.metadata, a.created_at
	FROM activities a
	JOIN users u ON u.id = a.actor_id
`;

function mapActivity(row: ActivityRow): ActivityItem {
	return {
		id: row.id,
		actorId: row.actor_id,
		actorName: row.actor_name,
		action: row.action,
		field: row.field,
		oldValue: row.old_value,
		newValue: row.new_value,
		metadata: row.metadata,
		createdAt: row.created_at
	};
}

export function logActivity(db: Database.Database, input: LogActivityInput): void {
	db.prepare(
		`INSERT INTO activities
		 (id, entity_type, entity_id, actor_id, action, field, old_value, new_value, metadata, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		randomUUID(),
		input.entityType,
		input.entityId,
		input.actorId,
		input.action,
		input.field ?? null,
		input.oldValue ?? null,
		input.newValue ?? null,
		input.metadata ? JSON.stringify(input.metadata) : null,
		new Date().toISOString()
	);
}

export function listProjectActivity(
	db: Database.Database,
	projectId: string,
	page: number,
	pageSize: number
): ActivityPage {
	const where = `WHERE (a.entity_type = 'project' AND a.entity_id = ?)
		OR (a.entity_type = 'task' AND a.entity_id IN (
			SELECT id FROM tasks WHERE project_id = ?
		))`;

	const total = (
		db.prepare(`SELECT COUNT(*) AS count FROM activities a ${where}`).get(projectId, projectId) as {
			count: number;
		}
	).count;

	const offset = (page - 1) * pageSize;
	const rows = db
		.prepare(
			`${ACTIVITY_SELECT} ${where}
			 ORDER BY a.created_at DESC, a.rowid DESC
			 LIMIT ? OFFSET ?`
		)
		.all(projectId, projectId, pageSize, offset) as ActivityRow[];

	return {
		items: rows.map(mapActivity),
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize))
	};
}

export function listRecentProjectActivity(
	db: Database.Database,
	projectId: string,
	limit = 5
): ActivityItem[] {
	const rows = db
		.prepare(
			`${ACTIVITY_SELECT}
			 WHERE (a.entity_type = 'project' AND a.entity_id = ?)
			    OR (a.entity_type = 'task' AND a.entity_id IN (
			        SELECT id FROM tasks WHERE project_id = ?
			    ))
			 ORDER BY a.created_at DESC, a.rowid DESC
			 LIMIT ?`
		)
		.all(projectId, projectId, limit) as ActivityRow[];

	return rows.map(mapActivity);
}

export function listTaskActivity(
	db: Database.Database,
	taskId: string,
	page: number,
	pageSize: number
): ActivityPage {
	const total = (
		db
			.prepare(
				"SELECT COUNT(*) AS count FROM activities WHERE entity_type = 'task' AND entity_id = ?"
			)
			.get(taskId) as { count: number }
	).count;

	const offset = (page - 1) * pageSize;
	const rows = db
		.prepare(
			`${ACTIVITY_SELECT}
			 WHERE a.entity_type = 'task' AND a.entity_id = ?
			 ORDER BY a.created_at DESC, a.rowid DESC
			 LIMIT ? OFFSET ?`
		)
		.all(taskId, pageSize, offset) as ActivityRow[];

	return {
		items: rows.map(mapActivity),
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize))
	};
}
