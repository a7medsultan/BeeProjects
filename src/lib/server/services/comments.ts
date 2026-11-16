import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { CommentItem, RoleName } from '#lib/types.ts';
import { extractMentionIds } from '#lib/mentions.ts';
import { logActivity } from './activity.ts';

export class CommentInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CommentInputError';
	}
}

interface CommentRow {
	id: string;
	task_id: string;
	author_id: string;
	author_name: string;
	author_role: string;
	body: string;
	created_at: string;
	updated_at: string;
}

export interface RawComment {
	id: string;
	task_id: string;
	author_id: string;
	body: string;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}

export function listTaskComments(db: Database.Database, taskId: string): CommentItem[] {
	const rows = db
		.prepare(
			`SELECT c.id, c.task_id, c.author_id, u.name AS author_name,
			        r.name AS author_role, c.body, c.created_at, c.updated_at
			 FROM task_comments c
			 JOIN users u ON u.id = c.author_id
			 JOIN roles r ON r.id = u.role_id
			 WHERE c.task_id = ? AND c.deleted_at IS NULL
			 ORDER BY c.created_at ASC, c.rowid ASC`
		)
		.all(taskId) as CommentRow[];

	return rows.map((row) => ({
		id: row.id,
		taskId: row.task_id,
		authorId: row.author_id,
		authorName: row.author_name,
		authorRole: row.author_role as RoleName,
		body: row.body,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		isEdited: row.updated_at !== row.created_at
	}));
}

export function getComment(db: Database.Database, commentId: string): RawComment | null {
	const row = db
		.prepare(
			`SELECT id, task_id, author_id, body, created_at, updated_at, deleted_at
			 FROM task_comments WHERE id = ?`
		)
		.get(commentId) as RawComment | undefined;

	return row ?? null;
}

export function validateMentionIds(db: Database.Database, projectId: string, body: string): void {
	const ids = extractMentionIds(body);

	if (ids.length === 0) return;

	const placeholders = ids.map(() => '?').join(', ');
	const rows = db
		.prepare(
			`SELECT u.id
			 FROM users u
			 JOIN project_members pm ON pm.user_id = u.id
			 WHERE pm.project_id = ? AND u.is_active = 1
			   AND u.id IN (${placeholders})`
		)
		.all(projectId, ...ids) as Array<{ id: string }>;

	if (rows.length !== ids.length) {
		throw new CommentInputError('Mentions must be active members of this project.');
	}
}

export function createComment(
	db: Database.Database,
	input: { taskId: string; projectId: string; authorId: string; body: string }
): string {
	validateMentionIds(db, input.projectId, input.body);

	const id = randomUUID();
	const now = new Date().toISOString();
	const body = input.body.trim();

	db.transaction(() => {
		db.prepare(
			`INSERT INTO task_comments (id, task_id, author_id, body, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`
		).run(id, input.taskId, input.authorId, body, now, now);

		logActivity(db, {
			entityType: 'task',
			entityId: input.taskId,
			actorId: input.authorId,
			action: 'task.comment_added',
			metadata: { commentId: id }
		});
	})();

	return id;
}

export function updateComment(
	db: Database.Database,
	comment: RawComment,
	body: string,
	actorId: string,
	projectId: string
): void {
	validateMentionIds(db, projectId, body);

	const now = new Date().toISOString();
	const updatedAt =
		now > comment.created_at
			? now
			: new Date(new Date(comment.created_at).getTime() + 1).toISOString();

	db.transaction(() => {
		db.prepare('UPDATE task_comments SET body = ?, updated_at = ? WHERE id = ?').run(
			body.trim(),
			updatedAt,
			comment.id
		);

		logActivity(db, {
			entityType: 'task',
			entityId: comment.task_id,
			actorId,
			action: 'task.comment_edited',
			metadata: { commentId: comment.id }
		});
	})();
}

export function deleteComment(db: Database.Database, comment: RawComment, actorId: string): void {
	const now = new Date().toISOString();

	db.transaction(() => {
		db.prepare('UPDATE task_comments SET deleted_at = ?, updated_at = ? WHERE id = ?').run(
			now,
			now,
			comment.id
		);

		logActivity(db, {
			entityType: 'task',
			entityId: comment.task_id,
			actorId,
			action: 'task.comment_deleted',
			metadata: { commentId: comment.id }
		});
	})();
}
