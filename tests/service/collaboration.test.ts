import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import type { PublicUser } from '#lib/types.ts';
import { applyMigrations } from '../../src/lib/server/db/migrate-shared.ts';
import { createUser, getUserByEmail } from '../../src/lib/server/services/users.ts';
import { addProjectMember, createProject } from '../../src/lib/server/services/projects.ts';
import { createTask } from '../../src/lib/server/services/tasks.ts';
import { listTaskActivity } from '../../src/lib/server/services/activity.ts';
import {
	createComment,
	deleteComment,
	getComment,
	listTaskComments,
	updateComment,
	CommentInputError
} from '../../src/lib/server/services/comments.ts';
import {
	deleteAttachment,
	getAttachmentRecord,
	listTaskAttachments,
	resolveAttachmentPath,
	storeAttachment,
	validateAttachment,
	AttachmentError,
	MAX_ATTACHMENT_BYTES
} from '../../src/lib/server/services/attachments.ts';

const initialSchema = readFileSync(
	new URL('../../src/lib/server/db/migrations/001_init.sql', import.meta.url),
	'utf8'
);

function makeDb(): Database.Database {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	applyMigrations(db, [{ version: '001_init', sql: initialSchema }]);
	return db;
}

async function makeUser(
	db: Database.Database,
	email: string,
	role: PublicUser['role'],
	name = email
): Promise<PublicUser> {
	await createUser(db, { name, email, role, timezone: 'UTC' });
	const user = getUserByEmail(db, email);
	if (!user) throw new Error('Test user was not created');

	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		timezone: user.timezone,
		mustChangePassword: user.mustChangePassword
	};
}

async function setup() {
	const db = makeDb();
	const admin = await makeUser(db, 'admin@example.com', 'admin', 'Admin');
	const member = await makeUser(db, 'member@example.com', 'member', 'Member');
	const outsider = await makeUser(db, 'outsider@example.com', 'member', 'Outsider');
	const projectId = createProject(
		db,
		{
			name: 'Collaboration project',
			description: '',
			startDate: '',
			dueDate: '',
			priority: 'Medium',
			status: 'Active'
		},
		admin
	);
	addProjectMember(db, projectId, member.id, admin);
	const taskId = createTask(
		db,
		projectId,
		{
			title: 'Collaboration task',
			description: '',
			priority: 'Medium',
			status: 'To Do',
			startDate: '',
			dueDate: '',
			assigneeIds: [member.id]
		},
		admin
	);

	return { db, admin, member, outsider, projectId, taskId };
}

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('comments service', () => {
	it('creates chronological comments, validates mentions, and logs activity', async () => {
		const { db, admin, member, outsider, projectId, taskId } = await setup();

		const firstId = createComment(db, {
			taskId,
			projectId,
			authorId: admin.id,
			body: `Hello @[${member.name}](${member.id}), please review.`
		});
		const secondId = createComment(db, {
			taskId,
			projectId,
			authorId: member.id,
			body: 'Looks good.'
		});

		const comments = listTaskComments(db, taskId);
		expect(comments.map((comment) => comment.id)).toEqual([firstId, secondId]);
		expect(comments[0]?.authorName).toBe('Admin');
		expect(comments[0]?.body).toContain('@[Member]');

		expect(() =>
			createComment(db, {
				taskId,
				projectId,
				authorId: admin.id,
				body: `@[${outsider.name}](${outsider.id}) should not be mentionable.`
			})
		).toThrow(CommentInputError);

		const activity = listTaskActivity(db, taskId, 1, 20).items;
		expect(activity.filter((item) => item.action === 'task.comment_added')).toHaveLength(2);

		db.close();
	});

	it('edits and soft-deletes comments with activity', async () => {
		const { db, admin, member, projectId, taskId } = await setup();
		const commentId = createComment(db, {
			taskId,
			projectId,
			authorId: member.id,
			body: 'Original body'
		});
		const comment = getComment(db, commentId);

		expect(comment).not.toBeNull();
		updateComment(db, comment!, 'Edited body', member.id, projectId);

		const edited = listTaskComments(db, taskId)[0];
		expect(edited?.body).toBe('Edited body');
		expect(edited?.isEdited).toBe(true);

		deleteComment(db, getComment(db, commentId)!, admin.id);
		expect(listTaskComments(db, taskId)).toHaveLength(0);

		const activity = listTaskActivity(db, taskId, 1, 20).items;
		expect(activity.some((item) => item.action === 'task.comment_edited')).toBe(true);
		expect(activity.some((item) => item.action === 'task.comment_deleted')).toBe(true);

		db.close();
	});
});

describe('attachments service', () => {
	it('validates and stores private attachments, then soft-deletes them', async () => {
		const { db, admin, taskId } = await setup();
		const dir = await mkdtemp(join(tmpdir(), 'beeprojects-attachments-'));
		tempDirs.push(dir);
		const buffer = Buffer.from('A small text attachment.');

		const attachmentId = await storeAttachment(
			db,
			dir,
			taskId,
			{
				buffer,
				originalName: 'notes.txt',
				mimeType: 'text/plain',
				size: buffer.length
			},
			admin
		);

		const attachments = listTaskAttachments(db, taskId);
		expect(attachments).toHaveLength(1);
		expect(attachments[0]?.fileName).toBe('notes.txt');
		expect(attachments[0]?.uploadedByName).toBe('Admin');

		const record = getAttachmentRecord(db, attachmentId);
		expect(record?.storedName).toMatch(/\.txt$/);

		const path = resolveAttachmentPath(dir, taskId, record!.storedName);
		expect((await readFile(path)).toString()).toBe('A small text attachment.');

		const activity = listTaskActivity(db, taskId, 1, 20).items;
		expect(activity.some((item) => item.action === 'task.attachment_added')).toBe(true);

		deleteAttachment(db, record!, admin);
		expect(listTaskAttachments(db, taskId)).toHaveLength(0);
		expect(getAttachmentRecord(db, attachmentId)).toBeNull();

		db.close();
	});

	it('rejects unsupported, spoofed, empty, and oversized files', async () => {
		const { db } = await setup();

		await expect(
			validateAttachment({
				buffer: Buffer.from('hello'),
				originalName: 'run.exe',
				mimeType: 'application/octet-stream',
				size: 5
			})
		).rejects.toBeInstanceOf(AttachmentError);

		await expect(
			validateAttachment({
				buffer: Buffer.from('not a png'),
				originalName: 'fake.png',
				mimeType: 'image/png',
				size: 9
			})
		).rejects.toBeInstanceOf(AttachmentError);

		await expect(
			validateAttachment({
				buffer: Buffer.alloc(0),
				originalName: 'empty.txt',
				mimeType: 'text/plain',
				size: 0
			})
		).rejects.toBeInstanceOf(AttachmentError);

		await expect(
			validateAttachment({
				buffer: Buffer.from('too large'),
				originalName: 'large.txt',
				mimeType: 'text/plain',
				size: MAX_ATTACHMENT_BYTES + 1
			})
		).rejects.toBeInstanceOf(AttachmentError);

		expect(
			(
				await validateAttachment({
					buffer: Buffer.from('plain text'),
					originalName: 'notes.txt',
					mimeType: 'text/plain',
					size: 10
				})
			).mimeType
		).toBe('text/plain');

		db.close();
	});
});
