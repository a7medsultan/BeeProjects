import { getDb } from './db/index.ts';
import { addDaysISO, localDateISO, localHour } from './dates.ts';
import { createNotification } from './services/notifications.ts';

let timer: ReturnType<typeof setInterval> | null = null;

function deleteExpiredSessions(db: ReturnType<typeof getDb>): void {
	db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
}

interface DeadlineRow {
	id: string;
	title: string;
	project_id: string;
	project_name: string;
	due_date: string;
	user_id: string;
	timezone: string;
}

export function runDeadlineNotifications(db: ReturnType<typeof getDb>, now = new Date()): void {
	const rows = db
		.prepare(
			`SELECT t.id, t.title, t.project_id, p.name AS project_name, t.due_date,
			        u.id AS user_id, u.timezone
			 FROM task_assignees ta
			 JOIN tasks t ON t.id = ta.task_id
			 JOIN projects p ON p.id = t.project_id
			 JOIN users u ON u.id = ta.user_id
			 WHERE t.deleted_at IS NULL AND t.status <> 'Done'
			   AND t.due_date IS NOT NULL
			   AND p.status <> 'Archived'
			   AND u.is_active = 1`
		)
		.all() as DeadlineRow[];

	for (const row of rows) {
		const today = localDateISO(row.timezone, now);
		const tomorrow = addDaysISO(today, 1);

		if (row.due_date === tomorrow && localHour(row.timezone, now) >= 8) {
			createNotification(db, {
				userId: row.user_id,
				type: 'due_soon',
				title: 'Task due tomorrow',
				body: `${row.title} · ${row.project_name}`,
				payload: { taskTitle: row.title, projectName: row.project_name },
				projectId: row.project_id,
				taskId: row.id,
				dedupeKey: `due_soon:${row.id}:${row.user_id}:${row.due_date}`
			});
		}

		if (row.due_date < today) {
			createNotification(db, {
				userId: row.user_id,
				type: 'overdue',
				title: 'Task is overdue',
				body: `${row.title} · ${row.project_name}`,
				payload: { taskTitle: row.title, projectName: row.project_name },
				projectId: row.project_id,
				taskId: row.id,
				dedupeKey: `overdue:${row.id}:${row.user_id}:${row.due_date}`
			});
		}
	}
}

function runHourly(): void {
	try {
		const db = getDb();
		deleteExpiredSessions(db);
		runDeadlineNotifications(db);
	} catch (error) {
		console.error('[jobs] hourly run failed', error);
	}
}

export function startJobs(): void {
	if (timer) return;
	runHourly();
	timer = setInterval(runHourly, 60 * 60 * 1000);
	timer.unref?.();
}

export function stopJobs(): void {
	if (!timer) return;
	clearInterval(timer);
	timer = null;
}
