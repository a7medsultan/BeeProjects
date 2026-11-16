import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { addDaysISO, localDateISO } from '#lib/server/dates.ts';
import { listMyTasks } from '#lib/server/services/tasks.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const includeCompleted = event.url.searchParams.get('includeCompleted') === '1';
	const tasks = listMyTasks(getDb(), user, includeCompleted);
	const today = localDateISO(user.timezone);
	const weekEnd = addDaysISO(today, 7);

	return {
		tasks,
		includeCompleted,
		overdueCount: tasks.filter((task) => task.isOverdue).length,
		upcomingCount: tasks.filter(
			(task) =>
				!task.isOverdue &&
				task.status !== 'Done' &&
				task.dueDate !== null &&
				task.dueDate >= today &&
				task.dueDate <= weekEnd
		).length
	};
};
