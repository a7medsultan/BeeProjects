import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import type { PublicUser } from '#lib/types.ts';
import { applyMigrations } from '../../src/lib/server/db/migrate-shared.ts';
import { createUser, getUserByEmail } from '../../src/lib/server/services/users.ts';
import {
	addProjectMember,
	archiveProject,
	createProject
} from '../../src/lib/server/services/projects.ts';
import { createTask } from '../../src/lib/server/services/tasks.ts';
import { getDashboard } from '../../src/lib/server/services/dashboard.ts';
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

const projectInput = {
	description: '',
	startDate: '',
	dueDate: '',
	priority: 'Medium' as const,
	status: 'Active' as const
};

describe('dashboard service', () => {
	it('aggregates stats, my work, and projects with permission scoping', async () => {
		const db = makeDb();
		const admin = await makeUser(db, 'admin@example.com', 'admin', 'Admin');
		const member = await makeUser(db, 'member@example.com', 'member', 'Member');
		const today = localDateISO('UTC');
		const yesterday = addDaysISO(today, -1);

		const projectId = createProject(db, { ...projectInput, name: 'Main project' }, admin);
		addProjectMember(db, projectId, member.id, admin);

		const otherProjectId = createProject(db, { ...projectInput, name: 'Admin project' }, admin);

		const archivedProjectId = createProject(
			db,
			{ ...projectInput, name: 'Archived project' },
			admin
		);
		addProjectMember(db, archivedProjectId, member.id, admin);

		const task = (
			title: string,
			status: 'To Do' | 'Done',
			dueDate: string,
			assigneeIds: string[],
			project = projectId
		) =>
			createTask(
				db,
				project,
				{
					title,
					description: '',
					priority: 'Medium',
					status,
					startDate: '',
					dueDate,
					assigneeIds
				},
				admin
			);

		task('Due today', 'To Do', today, [member.id]);
		task('Completed', 'Done', '', [member.id]);
		task('Overdue', 'To Do', yesterday, [member.id]);
		task('Unassigned', 'To Do', '', []);
		task('Admin project task', 'To Do', '', [admin.id], otherProjectId);
		task('Archived task', 'To Do', today, [member.id], archivedProjectId);
		archiveProject(db, archivedProjectId, admin);

		const adminDashboard = getDashboard(db, admin);
		expect(adminDashboard.stats.activeProjects).toBe(2);
		expect(adminDashboard.stats.openTasks).toBe(4);
		expect(adminDashboard.stats.completedTasks).toBe(1);
		expect(adminDashboard.stats.overdueTasks).toBe(1);
		expect(adminDashboard.stats.dueToday).toBe(1);
		expect(adminDashboard.projects).toHaveLength(2);
		expect(adminDashboard.projectTotal).toBe(2);

		const memberDashboard = getDashboard(db, member);
		expect(memberDashboard.stats.activeProjects).toBe(1);
		expect(memberDashboard.stats.openTasks).toBe(3);
		expect(memberDashboard.stats.completedTasks).toBe(1);
		expect(memberDashboard.stats.overdueTasks).toBe(1);
		expect(memberDashboard.stats.dueToday).toBe(1);
		expect(memberDashboard.myWork.assignedCount).toBe(2);
		expect(memberDashboard.myWork.overdueCount).toBe(1);
		expect(memberDashboard.myWork.upcomingCount).toBe(1);
		expect(memberDashboard.myWork.assigned.map((item) => item.title)).toEqual(
			expect.arrayContaining(['Due today', 'Overdue'])
		);
		expect(memberDashboard.myWork.overdue[0]?.title).toBe('Overdue');
		expect(memberDashboard.myWork.upcoming[0]?.title).toBe('Due today');
		expect(memberDashboard.projects).toHaveLength(1);
		expect(memberDashboard.projectTotal).toBe(1);

		db.close();
	});
});
