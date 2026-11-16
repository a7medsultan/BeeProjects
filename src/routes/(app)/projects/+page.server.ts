import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { projectListQuerySchema } from '#lib/schemas/projects.ts';
import { listProjects, listVisibleProjectOwners } from '#lib/server/services/projects.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const parsed = projectListQuerySchema.safeParse(Object.fromEntries(event.url.searchParams));
	const filters = parsed.success ? parsed.data : projectListQuerySchema.parse({});
	const db = getDb();

	return {
		...listProjects(db, user, filters),
		filters,
		owners: listVisibleProjectOwners(db, user),
		canCreate: user.role !== 'member'
	};
};
