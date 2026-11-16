import type { ActivityItem } from './types.ts';

const FIELD_LABELS: Record<string, string> = {
	name: 'the project name',
	description: 'the description',
	start_date: 'the start date',
	due_date: 'the due date',
	priority: 'the priority',
	status: 'the status',
	owner: 'the owner',
	title: 'the task title'
};

function formatValue(value: string | null): string {
	if (!value) return 'empty';

	const normalized = value.replace(/\s+/g, ' ').trim();
	return normalized.length > 120 ? `${normalized.slice(0, 117)}…` : normalized;
}

function describeUpdate(item: ActivityItem): string {
	const field = (item.field && FIELD_LABELS[item.field]) ?? item.field ?? 'details';

	if (item.oldValue && item.newValue) {
		return `${item.actorName} changed ${field} from “${formatValue(item.oldValue)}” to “${formatValue(item.newValue)}”`;
	}

	if (item.newValue) {
		return `${item.actorName} set ${field} to “${formatValue(item.newValue)}”`;
	}

	return `${item.actorName} cleared ${field}`;
}

export function describeActivity(item: ActivityItem): string {
	switch (item.action) {
		case 'project.created':
			return `${item.actorName} created the project`;
		case 'project.updated':
			return describeUpdate(item);
		case 'project.archived':
			return `${item.actorName} archived the project`;
		case 'project.unarchived':
			return `${item.actorName} restored the project`;
		case 'project.owner_changed':
			return `${item.actorName} changed the owner from ${formatValue(item.oldValue)} to ${formatValue(item.newValue)}`;
		case 'project.member_added':
			return `${item.actorName} added ${formatValue(item.newValue)} to the project`;
		case 'project.member_removed':
			return `${item.actorName} removed ${formatValue(item.oldValue)} from the project`;
		case 'task.created':
			return `${item.actorName} created the task`;
		case 'task.updated':
			return describeUpdate(item);
		case 'task.status_changed':
			return `${item.actorName} moved the task to ${formatValue(item.newValue)}`;
		case 'task.assignee_added':
			return `${item.actorName} assigned ${formatValue(item.newValue)}`;
		case 'task.assignee_removed':
			return `${item.actorName} unassigned ${formatValue(item.oldValue)}`;
		case 'task.deleted':
			return `${item.actorName} deleted the task`;
		case 'task.comment_added':
			return `${item.actorName} commented on the task`;
		case 'task.comment_edited':
			return `${item.actorName} edited a comment`;
		case 'task.comment_deleted':
			return `${item.actorName} deleted a comment`;
		case 'task.attachment_added':
			return `${item.actorName} attached ${formatValue(item.newValue)}`;
		case 'task.attachment_removed':
			return `${item.actorName} removed the attachment ${formatValue(item.oldValue)}`;
		default:
			return `${item.actorName} updated ${item.field ?? 'the project'}`;
	}
}
