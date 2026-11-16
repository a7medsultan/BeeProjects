import { redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import {
	getUnreadNotificationCount,
	listRecentNotifications
} from '#lib/server/services/notifications.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = url.pathname + url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	if (locals.user.mustChangePassword && url.pathname !== '/profile') {
		redirect(303, '/profile?force=1');
	}

	const db = getDb();

	return {
		user: locals.user,
		unreadCount: getUnreadNotificationCount(db, locals.user.id),
		recentNotifications: listRecentNotifications(db, locals.user.id, 5)
	};
};
