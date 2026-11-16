import { json } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { getUnreadNotificationCount } from '#lib/server/services/notifications.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const user = requireUser(event);

	return json(
		{ count: getUnreadNotificationCount(getDb(), user.id) },
		{ headers: { 'cache-control': 'no-store' } }
	);
};
