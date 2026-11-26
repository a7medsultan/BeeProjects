import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import type { PublicUser } from '#lib/types.ts';
import { applyMigrations } from '../../src/lib/server/db/migrate-shared.ts';
import { createUser, getUserByEmail } from '../../src/lib/server/services/users.ts';
import {
	addProjectMember,
	archiveProject,
	createProject,
	getProjectSummary,
	listProjectMembers,
	listProjects,
	ProjectMemberError,
	reassignProjectOwner,
	removeProjectMember,
	unarchiveProject,
	updateProject
} from '../../src/lib/server/services/projects.ts';
import { listProjectActivity } from '../../src/lib/server/services/activity.ts';
import { getProjectAccess } from '../../src/lib/server/permissions.ts';

const initialSchema = readFileSync(
	new URL('../../src/lib/server/db/migrations/001_init.sql', import.meta.url),
	'utf8'
);
const localeSchema = readFileSync(
	new URL(
		'../../src/lib/server/db/migrations/002_locale_and_notification_payload.sql',
		import.meta.url
	),
	'utf8'
);

function makeDb(): Database.Database {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	applyMigrations(db, [
		{ version: '001_init', sql: initialSchema },
		{ version: '002_locale_and_notification_payload', sql: localeSchema }
	]);
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
		locale: user.locale,
		timezone: user.timezone,
		mustChangePassword: user.mustChangePassword
	};
}

const projectInput = {
	name: 'Beehive Platform',
	description: 'A test project',
	startDate: '2026-01-01',
	dueDate: '2026-03-31',
	priority: 'High' as const,
	status: 'Active' as const
};

describe('project service', () => {
	it('creates a project, adds the owner as a member, and logs activity', async () => {
		const db = makeDb();
		const admin = await makeUser(db, 'admin@example.com', 'admin', 'Admin');

		const projectId = createProject(db, projectInput, admin);
		const project = getProjectSummary(db, projectId, admin);

		expect(project?.name).toBe('Beehive Platform');
		expect(project?.ownerId).toBe(admin.id);
		expect(project?.memberCount).toBe(1);
		expect(project?.progress).toBe(0);

		const members = listProjectMembers(db, projectId);
		expect(members).toHaveLength(1);
		expect(members[0]?.isOwner).toBe(true);

		const activity = listProjectActivity(db, projectId, 1, 10);
		expect(activity.items[0]?.action).toBe('project.created');

		db.close();
	});

	it('scopes project visibility to members unless the viewer is an admin', async () => {
		const db = makeDb();
		const admin = await makeUser(db, 'admin@example.com', 'admin', 'Admin');
		const manager = await makeUser(db, 'manager@example.com', 'project_manager', 'Manager');
		const member = await makeUser(db, 'member@example.com', 'member', 'Member');
		const outsider = await makeUser(db, 'outsider@example.com', 'member', 'Outsider');

		const projectId = createProject(db, { ...projectInput, ownerId: manager.id }, admin);
		addProjectMember(db, projectId, member.id, admin);

		expect(getProjectAccess(db, projectId, admin)?.isAdmin).toBe(true);
		expect(getProjectAccess(db, projectId, manager)?.isOwner).toBe(true);
		expect(getProjectAccess(db, projectId, member)?.isMember).toBe(true);
		expect(getProjectAccess(db, projectId, outsider)).toBeNull();

		const filters = {
			q: '',
			status: 'open' as const,
			owner: 'all',
			page: 1,
			pageSize: 12
		};

		expect(listProjects(db, admin, filters).total).toBe(1);
		expect(listProjects(db, manager, filters).total).toBe(1);
		expect(listProjects(db, member, filters).total).toBe(1);
		expect(listProjects(db, outsider, filters).total).toBe(0);

		db.close();
	});

	it('records field-level updates and supports archive/unarchive', async () => {
		const db = makeDb();
		const admin = await makeUser(db, 'admin@example.com', 'admin', 'Admin');
		const projectId = createProject(db, projectInput, admin);

		const changed = updateProject(
			db,
			projectId,
			{ ...projectInput, name: 'Renamed Project', status: 'On Hold' },
			admin
		);
		expect(changed).toEqual(expect.arrayContaining(['name', 'status']));

		const activity = listProjectActivity(db, projectId, 1, 20).items;
		expect(activity.some((item) => item.field === 'name')).toBe(true);
		expect(activity.some((item) => item.field === 'status')).toBe(true);

		expect(archiveProject(db, projectId, admin)).toBe(true);
		expect(getProjectSummary(db, projectId, admin)?.status).toBe('Archived');
		expect(getProjectAccess(db, projectId, admin)?.canManage).toBe(false);

		expect(unarchiveProject(db, projectId, admin)).toBe(true);
		expect(getProjectSummary(db, projectId, admin)?.status).toBe('Planning');
		expect(getProjectAccess(db, projectId, admin)?.canManage).toBe(true);

		db.close();
	});

	it('protects the owner and members with open tasks from removal', async () => {
		const db = makeDb();
		const admin = await makeUser(db, 'admin@example.com', 'admin', 'Admin');
		const member = await makeUser(db, 'member@example.com', 'member', 'Member');
		const projectId = createProject(db, projectInput, admin);
		addProjectMember(db, projectId, member.id, admin);

		try {
			removeProjectMember(db, projectId, admin.id, admin);
			throw new Error('Expected owner removal to fail');
		} catch (error) {
			expect(error).toBeInstanceOf(ProjectMemberError);
			expect((error as ProjectMemberError).code).toBe('owner');
		}

		const taskId = crypto.randomUUID();
		const now = new Date().toISOString();
		db.prepare(
			`INSERT INTO tasks
			 (id, project_id, title, description, created_by, priority, status, created_at, updated_at)
			 VALUES (?, ?, 'Open task', '', ?, 'Urgent', 'In Progress', ?, ?)`
		).run(taskId, projectId, admin.id, now, now);
		db.prepare(
			`INSERT INTO task_assignees (task_id, user_id, assigned_by, assigned_at)
			 VALUES (?, ?, ?, ?)`
		).run(taskId, member.id, admin.id, now);

		try {
			removeProjectMember(db, projectId, member.id, admin);
			throw new Error('Expected removal to fail');
		} catch (error) {
			expect(error).toBeInstanceOf(ProjectMemberError);
			expect((error as ProjectMemberError).code).toBe('open-tasks');
			expect((error as ProjectMemberError).openTasks).toBe(1);
		}

		db.prepare("UPDATE tasks SET status = 'Done' WHERE id = ?").run(taskId);
		removeProjectMember(db, projectId, member.id, admin);
		expect(listProjectMembers(db, projectId)).toHaveLength(1);

		db.close();
	});

	it('reassigns ownership and calculates progress from tasks', async () => {
		const db = makeDb();
		const admin = await makeUser(db, 'admin@example.com', 'admin', 'Admin');
		const manager = await makeUser(db, 'manager@example.com', 'project_manager', 'Manager');
		const projectId = createProject(db, projectInput, admin);

		reassignProjectOwner(db, projectId, manager.id, admin);

		const project = getProjectSummary(db, projectId, admin);
		expect(project?.ownerId).toBe(manager.id);
		expect(listProjectMembers(db, projectId).some((member) => member.userId === manager.id)).toBe(
			true
		);

		const now = new Date().toISOString();
		const insertTask = db.prepare(
			`INSERT INTO tasks
			 (id, project_id, title, description, created_by, priority, status, created_at, updated_at)
			 VALUES (?, ?, ?, '', ?, 'Medium', ?, ?, ?)`
		);
		insertTask.run(crypto.randomUUID(), projectId, 'Done task', admin.id, 'Done', now, now);
		insertTask.run(crypto.randomUUID(), projectId, 'Open task', admin.id, 'In Progress', now, now);

		expect(getProjectSummary(db, projectId, admin)?.progress).toBe(50);

		const activity = listProjectActivity(db, projectId, 1, 20).items;
		expect(activity.some((item) => item.action === 'project.owner_changed')).toBe(true);

		db.close();
	});
});
