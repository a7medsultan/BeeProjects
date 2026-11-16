import { userListQuerySchema } from '#lib/schemas/users.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireAdmin } from '#lib/server/auth/guards.ts';
import { listUsers } from '#lib/server/services/users.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);

	const parsed = userListQuerySchema.safeParse(Object.fromEntries(event.url.searchParams));
	const filters = parsed.success ? parsed.data : userListQuerySchema.parse({});
	const result = listUsers(getDb(), filters);

	return {
		...result,
		filters
	};
};
