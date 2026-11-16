import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import type { PublicUser } from '#lib/types.ts';
import { applyMigrations } from '../../src/lib/server/db/migrate-shared.ts';
import { createUser, getUserByEmail } from '../../src/lib/server/services/users.ts';
import { addProjectMember, createProject } from '../../src/lib/server/services/projects.ts';
import { getProjectAccess } from '../../src/lib/server/permissions.ts';
import { createTask, updateTask } from '../../src/lib/server/services/tasks.ts';
import { createComment } from '../../src/lib/server/services/comments.ts';
import {
	createNotification,
	getUnreadNotificationCount,
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead
} from '../../src/lib/server/services/notifications.ts';
import { runDeadlineNotifications } from '../../src/lib/server/jobs.ts';
import { addDaysISO, localDateISO } from '../../src/lib/server/dates.ts';

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
	const other = await makeUser(db, 'other@example.com', 'member', 'Other');
	const projectId = createProject(
		db,
		{
			name: 'Notification project',
			description: '',
			startDate: '',
			dueDate: '',
			priority: 'Medium',
			status: 'Active'
		},
		admin
	);
	addProjectMember(db, projectId, member.id, admin);
	addProjectMember(db, projectId, other.id, admin);

	return { db, admin, member, other, projectId };
}

function taskInput(title: string, dueDate = '', assigneeIds: string[] = []) {
	return {
		title,
		description: '',
		priority: 'Medium' as const,
		status: 'To Do' as const,
		startDate: '',
		dueDate,
		assigneeIds
	};
}

describe('notification service', () => {
	it('lists, scopes, and marks notifications as read', async () => {
		const { db, admin, member } = await setup();

		createNotification(db, {
			userId: member.id,
			type: 'task_assigned',
			title: 'Assigned to you',
			body: 'Task title',
			actorId: admin.id
		});
		createNotification(db, {
			userId: member.id,
			type: 'comment_added',
			title: 'New comment',
			body: 'Comment body',
			actorId: admin.id
		});

		expect(getUnreadNotificationCount(db, member.id)).toBe(2);
		expect(listNotifications(db, member.id, true, 1, 20).total).toBe(2);
		expect(listNotifications(db, member.id, false, 1, 20).items[0]?.actorName).toBe('Admin');

		const first = listNotifications(db, member.id, false, 1, 20).items[0]!;
		markNotificationRead(db, admin.id, first.id);
		expect(getUnreadNotificationCount(db, member.id)).toBe(2);

		markNotificationRead(db, member.id, first.id);
		expect(getUnreadNotificationCount(db, member.id)).toBe(1);

		markAllNotificationsRead(db, member.id);
		expect(getUnreadNotificationCount(db, member.id)).toBe(0);

		db.close();
	});

	it('notifies added and removed assignees without notifying the actor', async () => {
		const { db, admin, member, other, projectId } = await setup();
		const access = getProjectAccess(db, projectId, admin)!;

		const taskId = createTask(
			db,
			projectId,
			taskInput('Notify assignments', '', [member.id, other.id]),
			admin
		);

		let memberNotifications = listNotifications(db, member.id, false, 1, 20).items;
		let otherNotifications = listNotifications(db, other.id, false, 1, 20).items;
		const adminNotifications = listNotifications(db, admin.id, false, 1, 20).items;

		expect(memberNotifications.some((item) => item.type === 'task_assigned')).toBe(true);
		expect(otherNotifications.some((item) => item.type === 'task_assigned')).toBe(true);
		expect(adminNotifications.some((item) => item.type === 'task_assigned')).toBe(false);

		db.exec('DELETE FROM notifications');

		updateTask(db, taskId, { ...taskInput('Notify assignments', '', [other.id]) }, admin, access);

		memberNotifications = listNotifications(db, member.id, false, 1, 20).items;
		otherNotifications = listNotifications(db, other.id, false, 1, 20).items;

		expect(memberNotifications.some((item) => item.type === 'task_reassigned')).toBe(true);
		expect(otherNotifications.some((item) => item.type === 'task_assigned')).toBe(false);

		db.close();
	});

	it('sends mention notifications instead of generic comment notifications', async () => {
		const { db, admin, member, other, projectId } = await setup();
		const taskId = createTask(
			db,
			projectId,
			taskInput('Comment notifications', '', [member.id, other.id]),
			admin
		);

		db.exec('DELETE FROM notifications');

		createComment(db, {
			taskId,
			projectId,
			authorId: admin.id,
			body: `@[${member.name}](${member.id}) could you check this?`
		});

		const memberNotifications = listNotifications(db, member.id, false, 1, 20).items;
		const otherNotifications = listNotifications(db, other.id, false, 1, 20).items;

		expect(memberNotifications.some((item) => item.type === 'mention')).toBe(true);
		expect(memberNotifications.some((item) => item.type === 'comment_added')).toBe(false);
		expect(otherNotifications.some((item) => item.type === 'comment_added')).toBe(true);

		db.close();
	});

	it('creates due-soon and overdue reminders once per task, user, and due date', async () => {
		const { db, admin, member, projectId } = await setup();
		const now = new Date('2026-11-16T09:00:00.000Z');
		const today = localDateISO('UTC', now);
		const tomorrow = addDaysISO(today, 1);
		const yesterday = addDaysISO(today, -1);

		createTask(db, projectId, taskInput('Due tomorrow', tomorrow, [member.id]), admin);
		createTask(db, projectId, taskInput('Overdue task', yesterday, [member.id]), admin);

		db.exec('DELETE FROM notifications');
		runDeadlineNotifications(db, now);

		let notifications = listNotifications(db, member.id, false, 1, 50).items;
		expect(notifications.filter((item) => item.type === 'due_soon')).toHaveLength(1);
		expect(notifications.filter((item) => item.type === 'overdue')).toHaveLength(1);

		runDeadlineNotifications(db, now);
		notifications = listNotifications(db, member.id, false, 1, 50).items;
		expect(notifications.filter((item) => item.type === 'due_soon')).toHaveLength(1);
		expect(notifications.filter((item) => item.type === 'overdue')).toHaveLength(1);

		db.close();
	});
});
