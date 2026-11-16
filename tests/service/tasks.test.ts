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
	getProjectSummary
} from '../../src/lib/server/services/projects.ts';
import { getProjectAccess } from '../../src/lib/server/permissions.ts';
import { listTaskActivity } from '../../src/lib/server/services/activity.ts';
import { addDaysISO, localDateISO } from '../../src/lib/server/dates.ts';
import {
	createTask,
	deleteTask,
	getTaskDetail,
	getTopLevelTaskForCreate,
	listBoardTasks,
	listMyTasks,
	listProjectTasks,
	listSubtasks,
	moveTaskStatus,
	TaskInputError,
	updateTask
} from '../../src/lib/server/services/tasks.ts';
import type { ProjectAccess } from '../../src/lib/server/permissions.ts';

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
	name: 'Task Test Project',
	description: '',
	startDate: '',
	dueDate: '',
	priority: 'Medium' as const,
	status: 'Active' as const
};

async function setup() {
	const db = makeDb();
	const admin = await makeUser(db, 'admin@example.com', 'admin', 'Admin');
	const manager = await makeUser(db, 'manager@example.com', 'project_manager', 'Manager');
	const member = await makeUser(db, 'member@example.com', 'member', 'Member');
	const outsider = await makeUser(db, 'outsider@example.com', 'member', 'Outsider');
	const projectId = createProject(db, projectInput, admin);
	addProjectMember(db, projectId, manager.id, admin);
	addProjectMember(db, projectId, member.id, admin);
	const adminAccess = getProjectAccess(db, projectId, admin) as ProjectAccess;
	const memberAccess = getProjectAccess(db, projectId, member) as ProjectAccess;

	return { db, admin, manager, member, outsider, projectId, adminAccess, memberAccess };
}

const baseFilters = {
	q: '',
	status: 'all' as const,
	priority: 'all' as const,
	assignee: 'all',
	due: 'all' as const,
	sort: 'created_at' as const,
	dir: 'desc' as const,
	page: 1,
	pageSize: 20
};

describe('task service', () => {
	it('creates tasks with multiple assignees and task permissions', async () => {
		const { db, admin, member, outsider, projectId, adminAccess, memberAccess } = await setup();

		const taskId = createTask(
			db,
			projectId,
			{
				title: 'Implement API',
				description: 'Build the task endpoints',
				priority: 'High',
				status: 'In Progress',
				startDate: '',
				dueDate: '',
				assigneeIds: [member.id, admin.id]
			},
			admin
		);

		const adminDetail = getTaskDetail(db, taskId, admin);
		expect(adminDetail?.task.assignees).toHaveLength(2);
		expect(adminDetail?.permissions.canEdit).toBe(true);
		expect(adminDetail?.permissions.canManageAssignees).toBe(true);
		expect(adminDetail?.permissions.canDelete).toBe(true);

		const memberDetail = getTaskDetail(db, taskId, member);
		expect(memberDetail?.permissions.canEdit).toBe(true);
		expect(memberDetail?.permissions.canManageAssignees).toBe(false);
		expect(memberDetail?.permissions.canDelete).toBe(false);

		expect(getTaskDetail(db, taskId, outsider)).toBeNull();

		const activity = listTaskActivity(db, taskId, 1, 20).items;
		expect(activity.some((item) => item.action === 'task.created')).toBe(true);
		expect(activity.filter((item) => item.action === 'task.assignee_added')).toHaveLength(2);

		expect(memberAccess.canManage).toBe(false);
		expect(adminAccess.canManage).toBe(true);

		db.close();
	});

	it('filters, searches, sorts, and paginates tasks', async () => {
		const { db, admin, member, projectId } = await setup();
		const today = localDateISO('UTC');

		const create = (
			title: string,
			priority: 'Low' | 'Medium' | 'High' | 'Urgent',
			status: 'To Do' | 'In Progress' | 'Done',
			dueDate: string,
			assigneeId?: string
		) =>
			createTask(
				db,
				projectId,
				{
					title,
					description: `${title} description`,
					priority,
					status,
					startDate: '',
					dueDate,
					assigneeIds: assigneeId ? [assigneeId] : []
				},
				admin
			);

		create('Urgent overdue task', 'Urgent', 'In Progress', addDaysISO(today, -2), member.id);
		create('Due today task', 'Medium', 'To Do', today, member.id);
		create('Done high task', 'High', 'Done', addDaysISO(today, 2));
		create('Next week task', 'Low', 'To Do', addDaysISO(today, 6));

		expect(listProjectTasks(db, projectId, admin, { ...baseFilters, status: 'To Do' }).total).toBe(
			2
		);
		expect(
			listProjectTasks(db, projectId, admin, { ...baseFilters, priority: 'Urgent' }).total
		).toBe(1);
		expect(
			listProjectTasks(db, projectId, admin, { ...baseFilters, assignee: member.id }).total
		).toBe(2);
		expect(listProjectTasks(db, projectId, admin, { ...baseFilters, q: 'Urgent' }).total).toBe(1);
		expect(listProjectTasks(db, projectId, admin, { ...baseFilters, due: 'overdue' }).total).toBe(
			1
		);
		expect(listProjectTasks(db, projectId, admin, { ...baseFilters, due: 'today' }).total).toBe(1);
		expect(listProjectTasks(db, projectId, admin, { ...baseFilters, due: 'week' }).total).toBe(2);

		const byPriority = listProjectTasks(db, projectId, admin, {
			...baseFilters,
			sort: 'priority',
			dir: 'desc'
		});
		expect(byPriority.tasks[0]?.priority).toBe('Urgent');

		const page = listProjectTasks(db, projectId, admin, { ...baseFilters, pageSize: 2 });
		expect(page.tasks).toHaveLength(2);
		expect(page.total).toBe(4);
		expect(page.totalPages).toBe(2);

		db.close();
	});

	it('updates fields, status, completion, and assignees with activity', async () => {
		const { db, admin, member, projectId, adminAccess } = await setup();
		const taskId = createTask(
			db,
			projectId,
			{
				title: 'Initial task',
				description: '',
				priority: 'Low',
				status: 'To Do',
				startDate: '',
				dueDate: '',
				assigneeIds: [member.id]
			},
			admin
		);

		const changes = updateTask(
			db,
			taskId,
			{
				title: 'Updated task',
				description: 'New description',
				priority: 'High',
				status: 'Done',
				startDate: '2026-11-01',
				dueDate: '2026-11-30',
				assigneeIds: [admin.id]
			},
			admin,
			adminAccess
		);

		expect(changes).toEqual(
			expect.arrayContaining(['title', 'description', 'priority', 'status', 'assignees'])
		);

		const detail = getTaskDetail(db, taskId, admin);
		expect(detail?.task.status).toBe('Done');
		expect(detail?.task.completedAt).not.toBeNull();
		expect(detail?.task.assignees.map((assignee) => assignee.userId)).toEqual([admin.id]);

		const activity = listTaskActivity(db, taskId, 1, 30).items;
		expect(activity.some((item) => item.action === 'task.status_changed')).toBe(true);
		expect(activity.some((item) => item.action === 'task.assignee_removed')).toBe(true);
		expect(activity.some((item) => item.action === 'task.assignee_added')).toBe(true);

		db.close();
	});

	it('supports one-level subtasks and cascades soft deletion', async () => {
		const { db, admin, projectId } = await setup();
		const parentId = createTask(
			db,
			projectId,
			{
				title: 'Parent task',
				description: '',
				priority: 'Medium',
				status: 'In Progress',
				startDate: '',
				dueDate: '',
				assigneeIds: []
			},
			admin
		);

		expect(getTopLevelTaskForCreate(db, projectId, parentId)?.id).toBe(parentId);

		const subtaskId = createTask(
			db,
			projectId,
			{
				title: 'Subtask',
				description: '',
				priority: 'Low',
				status: 'To Do',
				startDate: '',
				dueDate: '',
				assigneeIds: [],
				parentTaskId: parentId
			},
			admin
		);

		expect(listSubtasks(db, parentId, admin)).toHaveLength(1);
		expect(getTaskDetail(db, subtaskId, admin)?.permissions.canCreateSubtask).toBe(false);

		expect(() =>
			createTask(
				db,
				projectId,
				{
					title: 'Nested subtask',
					description: '',
					priority: 'Low',
					status: 'To Do',
					startDate: '',
					dueDate: '',
					assigneeIds: [],
					parentTaskId: subtaskId
				},
				admin
			)
		).toThrow(TaskInputError);

		const projectIdAfterDelete = deleteTask(db, parentId, admin);
		expect(projectIdAfterDelete).toBe(projectId);
		expect(getTaskDetail(db, parentId, admin)).toBeNull();
		expect(getTaskDetail(db, subtaskId, admin)).toBeNull();

		db.close();
	});

	it('lists board tasks without subtasks and moves status with completion timestamps', async () => {
		const { db, admin, projectId } = await setup();

		const parentId = createTask(
			db,
			projectId,
			{
				title: 'Board parent',
				description: '',
				priority: 'High',
				status: 'To Do',
				startDate: '',
				dueDate: '',
				assigneeIds: []
			},
			admin
		);
		createTask(
			db,
			projectId,
			{
				title: 'Board subtask',
				description: '',
				priority: 'Low',
				status: 'In Progress',
				startDate: '',
				dueDate: '',
				assigneeIds: [],
				parentTaskId: parentId
			},
			admin
		);

		const boardTasks = listBoardTasks(db, projectId, admin);
		expect(boardTasks.map((task) => task.id)).toEqual([parentId]);

		const moved = moveTaskStatus(db, parentId, 'Done', admin);
		expect(moved?.status).toBe('Done');
		expect(moved?.completedAt).not.toBeNull();
		expect(getTaskDetail(db, parentId, admin)?.task.status).toBe('Done');

		const reopened = moveTaskStatus(db, parentId, 'In Progress', admin);
		expect(reopened?.completedAt).toBeNull();
		expect(getTaskDetail(db, parentId, admin)?.task.completedAt).toBeNull();

		const activity = listTaskActivity(db, parentId, 1, 20).items;
		expect(activity.filter((item) => item.action === 'task.status_changed')).toHaveLength(2);

		db.close();
	});

	it('lists my tasks and filters completed and archived projects', async () => {
		const { db, admin, member, projectId } = await setup();

		createTask(
			db,
			projectId,
			{
				title: 'My open task',
				description: '',
				priority: 'High',
				status: 'To Do',
				startDate: '',
				dueDate: '',
				assigneeIds: [member.id]
			},
			admin
		);
		createTask(
			db,
			projectId,
			{
				title: 'My done task',
				description: '',
				priority: 'Medium',
				status: 'Done',
				startDate: '',
				dueDate: '',
				assigneeIds: [member.id]
			},
			admin
		);
		createTask(
			db,
			projectId,
			{
				title: 'Admin task',
				description: '',
				priority: 'Low',
				status: 'To Do',
				startDate: '',
				dueDate: '',
				assigneeIds: [admin.id]
			},
			admin
		);

		const openTasks = listMyTasks(db, member, false);
		expect(openTasks.map((task) => task.title)).toEqual(['My open task']);

		const allTasks = listMyTasks(db, member, true);
		expect(allTasks.map((task) => task.title)).toEqual(
			expect.arrayContaining(['My open task', 'My done task'])
		);

		const archivedProjectId = createProject(
			db,
			{ ...projectInput, name: 'Archived project' },
			admin
		);
		addProjectMember(db, archivedProjectId, member.id, admin);
		createTask(
			db,
			archivedProjectId,
			{
				title: 'Archived task',
				description: '',
				priority: 'Low',
				status: 'To Do',
				startDate: '',
				dueDate: '',
				assigneeIds: [member.id]
			},
			admin
		);
		archiveProject(db, archivedProjectId, admin);

		expect(listMyTasks(db, member, true).some((task) => task.title === 'Archived task')).toBe(
			false
		);

		db.close();
	});

	it('calculates project progress from completed tasks', async () => {
		const { db, admin, projectId } = await setup();

		for (const status of ['Done', 'In Progress'] as const) {
			createTask(
				db,
				projectId,
				{
					title: `${status} task`,
					description: '',
					priority: 'Medium',
					status,
					startDate: '',
					dueDate: '',
					assigneeIds: []
				},
				admin
			);
		}

		expect(getProjectSummary(db, projectId, admin)?.progress).toBe(50);

		db.close();
	});
});
