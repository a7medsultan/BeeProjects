import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import {
	getNotification,
	getUnreadNotificationCount,
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead
} from '#lib/server/services/notifications.ts';
import { translate } from '#lib/i18n/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = getDb();
	const unreadOnly = event.url.searchParams.get('filter') === 'unread';
	const parsedPage = Number(event.url.searchParams.get('page') ?? '1');
	const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
	const result = listNotifications(db, user.id, unreadOnly, page, 20);

	return {
		...result,
		unreadOnly,
		unreadCount: getUnreadNotificationCount(db, user.id)
	};
};

export const actions: Actions = {
	markRead: async (event) => {
		const user = requireUser(event);
		const formData = await event.request.formData();
		const notificationId = String(formData.get('notificationId') ?? '');

		if (!notificationId) {
			return fail(400, { error: translate(event.locals.locale, 'notifications.required') });
		}

		markNotificationRead(getDb(), user.id, notificationId);
		return { notice: translate(event.locals.locale, 'server.notificationMarkedRead') };
	},

	markAllRead: async (event) => {
		const user = requireUser(event);
		markAllNotificationsRead(getDb(), user.id);
		return { notice: translate(event.locals.locale, 'server.notificationsMarkedRead') };
	},

	open: async (event) => {
		const user = requireUser(event);
		const formData = await event.request.formData();
		const notificationId = String(formData.get('notificationId') ?? '');
		const db = getDb();
		const notification = getNotification(db, user.id, notificationId);

		if (!notification) {
			return fail(404, { error: translate(event.locals.locale, 'notifications.notFound') });
		}

		markNotificationRead(db, user.id, notificationId);

		if (notification.taskId) {
			redirect(303, `/tasks/${notification.taskId}`);
		}

		if (notification.projectId) {
			redirect(303, `/projects/${notification.projectId}`);
		}

		redirect(303, '/notifications');
	}
};
