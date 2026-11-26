import type { ActivityItem } from './types.ts';
import type { MessageKey } from './i18n/messages/en.ts';
import type { I18n } from './i18n/index.ts';
import { enumLabelKey } from './i18n/labels.ts';

type Translate = I18n['t'];

const FIELD_KEYS: Record<string, MessageKey> = {
	name: 'activity.field.name',
	description: 'activity.field.description',
	start_date: 'activity.field.start_date',
	due_date: 'activity.field.due_date',
	priority: 'activity.field.priority',
	status: 'activity.field.status',
	owner: 'activity.field.owner',
	title: 'activity.field.title'
};

function formatValue(value: string | null, field: string | null, t: Translate): string {
	if (!value) return t('activity.value.empty');

	const enumKey = enumLabelKey(value);
	if (enumKey && (field === 'status' || field === 'priority')) {
		return t(enumKey);
	}

	const normalized = value.replace(/\s+/g, ' ').trim();
	return normalized.length > 120 ? `${normalized.slice(0, 117)}…` : normalized;
}

function describeUpdate(item: ActivityItem, t: Translate): string {
	const fieldKey = item.field ? FIELD_KEYS[item.field] : null;
	const field = fieldKey ? t(fieldKey) : (item.field ?? t('activity.field.details'));

	if (item.oldValue && item.newValue) {
		return t('activity.update.fromTo', {
			actor: item.actorName,
			field,
			old: formatValue(item.oldValue, item.field, t),
			new: formatValue(item.newValue, item.field, t)
		});
	}

	if (item.newValue) {
		return t('activity.update.setTo', {
			actor: item.actorName,
			field,
			value: formatValue(item.newValue, item.field, t)
		});
	}

	return t('activity.update.cleared', { actor: item.actorName, field });
}

export function describeActivity(item: ActivityItem, t: Translate): string {
	switch (item.action) {
		case 'project.created':
			return t('activity.project.created', { actor: item.actorName });
		case 'project.updated':
			return describeUpdate(item, t);
		case 'project.archived':
			return t('activity.project.archived', { actor: item.actorName });
		case 'project.unarchived':
			return t('activity.project.unarchived', { actor: item.actorName });
		case 'project.owner_changed':
			return t('activity.project.ownerChanged', {
				actor: item.actorName,
				old: formatValue(item.oldValue, item.field, t),
				new: formatValue(item.newValue, item.field, t)
			});
		case 'project.member_added':
			return t('activity.project.memberAdded', {
				actor: item.actorName,
				member: formatValue(item.newValue, item.field, t)
			});
		case 'project.member_removed':
			return t('activity.project.memberRemoved', {
				actor: item.actorName,
				member: formatValue(item.oldValue, item.field, t)
			});
		case 'task.created':
			return t('activity.task.created', { actor: item.actorName });
		case 'task.updated':
			return describeUpdate(item, t);
		case 'task.status_changed':
			return t('activity.task.statusChanged', {
				actor: item.actorName,
				status: formatValue(item.newValue, 'status', t)
			});
		case 'task.assignee_added':
			return t('activity.task.assigneeAdded', {
				actor: item.actorName,
				assignee: formatValue(item.newValue, item.field, t)
			});
		case 'task.assignee_removed':
			return t('activity.task.assigneeRemoved', {
				actor: item.actorName,
				assignee: formatValue(item.oldValue, item.field, t)
			});
		case 'task.deleted':
			return t('activity.task.deleted', { actor: item.actorName });
		case 'task.comment_added':
			return t('activity.task.commentAdded', { actor: item.actorName });
		case 'task.comment_edited':
			return t('activity.task.commentEdited', { actor: item.actorName });
		case 'task.comment_deleted':
			return t('activity.task.commentDeleted', { actor: item.actorName });
		case 'task.attachment_added':
			return t('activity.task.attachmentAdded', {
				actor: item.actorName,
				file: formatValue(item.newValue, item.field, t)
			});
		case 'task.attachment_removed':
			return t('activity.task.attachmentRemoved', {
				actor: item.actorName,
				file: formatValue(item.oldValue, item.field, t)
			});
		default:
			return t('activity.unknown', {
				actor: item.actorName,
				field: item.field ?? t('activity.field.details')
			});
	}
}
