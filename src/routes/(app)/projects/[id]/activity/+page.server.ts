import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/permissions.ts';
import { listProjectActivity } from '#lib/server/services/activity.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = getDb();
	requireProjectAccess(db, event.params.id, user);

	const parsedPage = Number(event.url.searchParams.get('page') ?? '1');
	const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

	return {
		activity: listProjectActivity(db, event.params.id, page, 20)
	};
};
