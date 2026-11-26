import type { NotificationItem } from '#lib/types.ts';
import type { I18n } from './index.ts';

type Translate = I18n['t'];

export function notificationTitle(item: NotificationItem, t: Translate): string {
	const payload = item.payload;
	const actor = payload?.actorName ?? item.actorName;

	if (!payload && item.title) {
		return item.title;
	}

	switch (item.type) {
		case 'task_assigned':
			return t('notifications.assigned', { actor: actor ?? '' });
		case 'task_reassigned':
			if (payload?.variant === 'unassigned') {
				return t('notifications.unassigned', { actor: actor ?? '' });
			}
			return t('notifications.reassigned', { actor: actor ?? '' });
		case 'comment_added':
			return t('notifications.commented', { actor: actor ?? '' });
		case 'mention':
			return t('notifications.mentioned', { actor: actor ?? '' });
		case 'due_soon':
			return t('notifications.dueSoon');
		case 'overdue':
			return t('notifications.overdue');
		default:
			return item.title;
	}
}

export function notificationBody(item: NotificationItem, t: Translate): string | null {
	const payload = item.payload;

	if (!payload) {
		return item.body;
	}

	if (item.type === 'due_soon' || item.type === 'overdue') {
		if (payload.taskTitle && payload.projectName) {
			return t('notifications.taskProject', {
				task: payload.taskTitle,
				project: payload.projectName
			});
		}
	}

	if (item.type === 'comment_added' || item.type === 'mention') {
		if (payload.taskTitle && payload.excerpt) {
			return t('notifications.commentBody', {
				task: payload.taskTitle,
				excerpt: payload.excerpt
			});
		}
	}

	return payload.taskTitle ?? item.body;
}
