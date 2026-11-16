import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/permissions.ts';
import { taskListQuerySchema } from '#lib/schemas/tasks.ts';
import { listProjectMembers } from '#lib/server/services/projects.ts';
import { listProjectTasks } from '#lib/server/services/tasks.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = getDb();
	const access = requireProjectAccess(db, event.params.id, user);
	const parsed = taskListQuerySchema.safeParse(Object.fromEntries(event.url.searchParams));
	const filters = parsed.success ? parsed.data : taskListQuerySchema.parse({});
	const result = listProjectTasks(db, event.params.id, user, filters);

	return {
		...result,
		filters,
		assignees: listProjectMembers(db, event.params.id),
		canCreate: access.canManage
	};
};
