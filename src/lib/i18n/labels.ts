import type {
	ProjectPriority,
	ProjectStatus,
	RoleName,
	TaskPriority,
	TaskStatus
} from '#lib/types.ts';
import type { MessageKey } from './messages/en.ts';

export const ROLE_KEYS: Record<RoleName, MessageKey> = {
	admin: 'enum.role.admin',
	project_manager: 'enum.role.project_manager',
	member: 'enum.role.member'
};

export const PROJECT_STATUS_KEYS: Record<ProjectStatus, MessageKey> = {
	Planning: 'enum.projectStatus.planning',
	Active: 'enum.projectStatus.active',
	'On Hold': 'enum.projectStatus.on_hold',
	Completed: 'enum.projectStatus.completed',
	Archived: 'enum.projectStatus.archived'
};

export const TASK_STATUS_KEYS: Record<TaskStatus, MessageKey> = {
	Backlog: 'enum.taskStatus.backlog',
	'To Do': 'enum.taskStatus.to_do',
	'In Progress': 'enum.taskStatus.in_progress',
	Review: 'enum.taskStatus.review',
	Done: 'enum.taskStatus.done'
};

export const PROJECT_PRIORITY_KEYS: Record<ProjectPriority, MessageKey> = {
	Low: 'enum.priority.low',
	Medium: 'enum.priority.medium',
	High: 'enum.priority.high'
};

export const TASK_PRIORITY_KEYS: Record<TaskPriority, MessageKey> = {
	Low: 'enum.priority.low',
	Medium: 'enum.priority.medium',
	High: 'enum.priority.high',
	Urgent: 'enum.priority.urgent'
};

const PROJECT_STATUS_BY_VALUE = new Map<string, MessageKey>(Object.entries(PROJECT_STATUS_KEYS));
const TASK_STATUS_BY_VALUE = new Map<string, MessageKey>(Object.entries(TASK_STATUS_KEYS));
const PRIORITY_BY_VALUE = new Map<string, MessageKey>([
	...Object.entries(PROJECT_PRIORITY_KEYS),
	...Object.entries(TASK_PRIORITY_KEYS)
]);

export function enumLabelKey(value: string | null | undefined): MessageKey | null {
	if (!value) return null;
	return (
		PROJECT_STATUS_BY_VALUE.get(value) ??
		TASK_STATUS_BY_VALUE.get(value) ??
		PRIORITY_BY_VALUE.get(value) ??
		null
	);
}
