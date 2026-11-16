import type Database from 'better-sqlite3';
import type { DashboardData, PublicUser } from '#lib/types.ts';
import { addDaysISO, localDateISO } from '../dates.ts';
import { listProjects } from './projects.ts';
import { queryTasks } from './tasks.ts';

export function getDashboard(db: Database.Database, viewer: PublicUser): DashboardData {
	const today = localDateISO(viewer.timezone);
	const weekEnd = addDaysISO(today, 7);
	const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
	const isAdmin = viewer.role === 'admin';

	const projectScope = isAdmin
		? ''
		: 'AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = @userId)';
	const taskScope = isAdmin
		? ''
		: 'AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = @userId)';

	const params = { userId: viewer.id, today };

	function count(sql: string, extra: Record<string, string | number> = {}): number {
		const row = db.prepare(sql).get({ ...params, ...extra }) as { count: number };
		return row.count;
	}

	const taskFrom = `FROM tasks t JOIN projects p ON p.id = t.project_id
		WHERE t.deleted_at IS NULL AND p.status <> 'Archived' ${taskScope}`;

	const stats = {
		activeProjects: count(
			`SELECT COUNT(*) AS count FROM projects p WHERE p.status = 'Active' ${projectScope}`
		),
		openTasks: count(`SELECT COUNT(*) AS count ${taskFrom} AND t.status <> 'Done'`),
		completedTasks: count(`SELECT COUNT(*) AS count ${taskFrom} AND t.status = 'Done'`),
		overdueTasks: count(
			`SELECT COUNT(*) AS count ${taskFrom} AND t.status <> 'Done' AND t.due_date IS NOT NULL AND t.due_date < @today`
		),
		dueToday: count(
			`SELECT COUNT(*) AS count ${taskFrom} AND t.status <> 'Done' AND t.due_date = @today`
		)
	};

	const assignedBase = `EXISTS (
		SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = @userId
	) AND p.status <> 'Archived' AND t.status <> 'Done' ${taskScope}`;

	const overdueWhere = `${assignedBase} AND t.due_date IS NOT NULL AND t.due_date < @today`;
	const upcomingWhere = `${assignedBase} AND t.due_date IS NOT NULL AND t.due_date >= @today AND t.due_date <= @weekEnd`;
	const recentlyWhere = `p.status <> 'Archived' AND t.updated_at >= @recentCutoff ${taskScope}`;

	const assigned = queryTasks(db, viewer, {
		where: assignedBase,
		params: { userId: viewer.id },
		orderBy: `(t.due_date IS NULL) ASC, t.due_date ASC,
			CASE t.priority WHEN 'Urgent' THEN 4 WHEN 'High' THEN 3
			WHEN 'Medium' THEN 2 ELSE 1 END DESC,
			t.created_at DESC`,
		limit: 5
	});

	const overdue = queryTasks(db, viewer, {
		where: overdueWhere,
		params: { userId: viewer.id },
		orderBy: 't.due_date ASC',
		limit: 5
	});

	const upcoming = queryTasks(db, viewer, {
		where: upcomingWhere,
		params: { userId: viewer.id, weekEnd },
		orderBy: 't.due_date ASC',
		limit: 5
	});

	const recentlyUpdated = queryTasks(db, viewer, {
		where: recentlyWhere,
		params: { userId: viewer.id, recentCutoff },
		orderBy: 't.updated_at DESC',
		limit: 5
	});

	const assignedCount = count(`SELECT COUNT(*) AS count ${taskFrom} AND ${assignedBase}`);
	const overdueCount = count(`SELECT COUNT(*) AS count ${taskFrom} AND ${overdueWhere}`);
	const upcomingCount = count(`SELECT COUNT(*) AS count ${taskFrom} AND ${upcomingWhere}`, {
		weekEnd
	});

	const projectResult = listProjects(db, viewer, {
		q: '',
		status: 'open',
		owner: 'all',
		page: 1,
		pageSize: 6
	});

	return {
		stats,
		myWork: {
			assigned,
			overdue,
			upcoming,
			recentlyUpdated,
			assignedCount,
			overdueCount,
			upcomingCount
		},
		projects: projectResult.projects,
		projectTotal: projectResult.total
	};
}
