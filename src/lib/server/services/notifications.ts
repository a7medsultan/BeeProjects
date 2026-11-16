import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { NotificationItem, NotificationType } from '#lib/types.ts';

export interface NotificationPage {
	items: NotificationItem[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface CreateNotificationInput {
	userId: string;
	type: NotificationType;
	title: string;
	body?: string | null;
	projectId?: string | null;
	taskId?: string | null;
	commentId?: string | null;
	actorId?: string | null;
	dedupeKey?: string | null;
}

export interface AssignmentRecipient {
	userId: string;
	name: string;
}

interface NotificationRow {
	id: string;
	type: string;
	title: string;
	body: string | null;
	project_id: string | null;
	task_id: string | null;
	comment_id: string | null;
	actor_name: string | null;
	is_read: number;
	created_at: string;
}

const NOTIFICATION_SELECT = `
	SELECT n.id, n.type, n.title, n.body, n.project_id, n.task_id, n.comment_id,
	       u.name AS actor_name, n.is_read, n.created_at
	FROM notifications n
	LEFT JOIN users u ON u.id = n.actor_id
`;

function mapNotification(row: NotificationRow): NotificationItem {
	return {
		id: row.id,
		type: row.type as NotificationType,
		title: row.title,
		body: row.body,
		projectId: row.project_id,
		taskId: row.task_id,
		commentId: row.comment_id,
		actorName: row.actor_name,
		isRead: row.is_read === 1,
		createdAt: row.created_at
	};
}

function excerpt(body: string): string {
	const plain = body
		.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
		.replace(/\s+/g, ' ')
		.trim();

	return plain.length > 140 ? `${plain.slice(0, 137)}…` : plain;
}

export function createNotification(db: Database.Database, input: CreateNotificationInput): void {
	db.prepare(
		`INSERT OR IGNORE INTO notifications
		 (id, user_id, type, title, body, project_id, task_id, comment_id, actor_id,
		  is_read, dedupe_key, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
	).run(
		randomUUID(),
		input.userId,
		input.type,
		input.title,
		input.body ?? null,
		input.projectId ?? null,
		input.taskId ?? null,
		input.commentId ?? null,
		input.actorId ?? null,
		input.dedupeKey ?? null,
		new Date().toISOString()
	);
}

export function notifyTaskAssignment(
	db: Database.Database,
	input: {
		taskId: string;
		projectId: string;
		taskTitle: string;
		actorId: string;
		actorName: string;
		added: AssignmentRecipient[];
		removed: AssignmentRecipient[];
		hadAssignees: boolean;
	}
): void {
	for (const recipient of input.added) {
		if (recipient.userId === input.actorId) continue;

		createNotification(db, {
			userId: recipient.userId,
			type: input.hadAssignees ? 'task_reassigned' : 'task_assigned',
			title: input.hadAssignees
				? `${input.actorName} reassigned a task to you`
				: `${input.actorName} assigned you a task`,
			body: input.taskTitle,
			projectId: input.projectId,
			taskId: input.taskId,
			actorId: input.actorId
		});
	}

	for (const recipient of input.removed) {
		if (recipient.userId === input.actorId) continue;

		createNotification(db, {
			userId: recipient.userId,
			type: 'task_reassigned',
			title: `${input.actorName} unassigned you from a task`,
			body: input.taskTitle,
			projectId: input.projectId,
			taskId: input.taskId,
			actorId: input.actorId
		});
	}
}

export function notifyComment(
	db: Database.Database,
	input: {
		taskId: string;
		projectId: string;
		commentId: string;
		authorId: string;
		body: string;
		mentionIds: string[];
	}
): void {
	const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(input.taskId) as
		{ title: string } | undefined;

	if (!task) return;

	const author = db.prepare('SELECT name FROM users WHERE id = ?').get(input.authorId) as
		{ name: string } | undefined;

	if (!author) return;

	const recipients = db
		.prepare(
			`SELECT u.id AS user_id
			 FROM task_assignees ta
			 JOIN users u ON u.id = ta.user_id
			 WHERE ta.task_id = ? AND u.is_active = 1
			 UNION
			 SELECT u.id AS user_id
			 FROM tasks t
			 JOIN users u ON u.id = t.created_by
			 WHERE t.id = ? AND u.is_active = 1`
		)
		.all(input.taskId, input.taskId) as Array<{ user_id: string }>;

	const mentioned = new Set(input.mentionIds);
	const body = `${task.title}: ${excerpt(input.body)}`;

	for (const userId of mentioned) {
		if (userId === input.authorId) continue;

		createNotification(db, {
			userId,
			type: 'mention',
			title: `${author.name} mentioned you`,
			body,
			projectId: input.projectId,
			taskId: input.taskId,
			commentId: input.commentId,
			actorId: input.authorId
		});
	}

	const seen = new Set<string>();

	for (const recipient of recipients) {
		const userId = recipient.user_id;

		if (userId === input.authorId || mentioned.has(userId) || seen.has(userId)) continue;
		seen.add(userId);

		createNotification(db, {
			userId,
			type: 'comment_added',
			title: `${author.name} commented on a task`,
			body,
			projectId: input.projectId,
			taskId: input.taskId,
			commentId: input.commentId,
			actorId: input.authorId
		});
	}
}

export function listNotifications(
	db: Database.Database,
	userId: string,
	unreadOnly: boolean,
	page: number,
	pageSize: number
): NotificationPage {
	const filter = unreadOnly ? 'AND n.is_read = 0' : '';
	const total = (
		db
			.prepare(`SELECT COUNT(*) AS count FROM notifications n WHERE n.user_id = ? ${filter}`)
			.get(userId) as { count: number }
	).count;

	const offset = (page - 1) * pageSize;
	const rows = db
		.prepare(
			`${NOTIFICATION_SELECT}
			 WHERE n.user_id = ? ${filter}
			 ORDER BY n.created_at DESC, n.rowid DESC
			 LIMIT ? OFFSET ?`
		)
		.all(userId, pageSize, offset) as NotificationRow[];

	return {
		items: rows.map(mapNotification),
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize))
	};
}

export function listRecentNotifications(
	db: Database.Database,
	userId: string,
	limit = 5
): NotificationItem[] {
	const rows = db
		.prepare(
			`${NOTIFICATION_SELECT}
			 WHERE n.user_id = ?
			 ORDER BY n.created_at DESC, n.rowid DESC
			 LIMIT ?`
		)
		.all(userId, limit) as NotificationRow[];

	return rows.map(mapNotification);
}

export function getUnreadNotificationCount(db: Database.Database, userId: string): number {
	const row = db
		.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0')
		.get(userId) as { count: number };

	return row.count;
}

export function getNotification(
	db: Database.Database,
	userId: string,
	notificationId: string
): NotificationItem | null {
	const row = db
		.prepare(`${NOTIFICATION_SELECT} WHERE n.id = ? AND n.user_id = ?`)
		.get(notificationId, userId) as NotificationRow | undefined;

	return row ? mapNotification(row) : null;
}

export function markNotificationRead(
	db: Database.Database,
	userId: string,
	notificationId: string
): void {
	db.prepare('UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ? AND user_id = ?').run(
		new Date().toISOString(),
		notificationId,
		userId
	);
}

export function markAllNotificationsRead(db: Database.Database, userId: string): void {
	db.prepare(
		'UPDATE notifications SET is_read = 1, read_at = ? WHERE user_id = ? AND is_read = 0'
	).run(new Date().toISOString(), userId);
}
