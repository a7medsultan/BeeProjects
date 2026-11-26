import type { ProjectPriority, ProjectStatus, TaskPriority, TaskStatus } from './types.ts';

export const PROJECT_STATUSES = [
	'Planning',
	'Active',
	'On Hold',
	'Completed',
	'Archived'
] as const satisfies readonly ProjectStatus[];

export const PROJECT_OPEN_STATUSES = [
	'Planning',
	'Active',
	'On Hold',
	'Completed'
] as const satisfies readonly ProjectStatus[];

export const PROJECT_PRIORITIES = [
	'Low',
	'Medium',
	'High'
] as const satisfies readonly ProjectPriority[];

export const PROJECT_STATUS_CLASSES: Record<ProjectStatus, string> = {
	Planning: 'bg-slate-100 text-slate-700',
	Active: 'bg-emerald-50 text-emerald-700',
	'On Hold': 'bg-amber-50 text-amber-700',
	Completed: 'bg-sky-50 text-sky-700',
	Archived: 'bg-slate-200 text-slate-600'
};

export const PROJECT_PRIORITY_CLASSES: Record<ProjectPriority, string> = {
	Low: 'bg-slate-100 text-slate-600',
	Medium: 'bg-amber-50 text-amber-700',
	High: 'bg-rose-50 text-rose-700'
};

export const TASK_STATUSES = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'] as const;

export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;

export const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
	Backlog: 'bg-slate-100 text-slate-700',
	'To Do': 'bg-sky-50 text-sky-700',
	'In Progress': 'bg-amber-50 text-amber-700',
	Review: 'bg-violet-50 text-violet-700',
	Done: 'bg-emerald-50 text-emerald-700'
};

export const TASK_PRIORITY_CLASSES: Record<TaskPriority, string> = {
	Low: 'bg-slate-100 text-slate-600',
	Medium: 'bg-sky-50 text-sky-700',
	High: 'bg-amber-50 text-amber-700',
	Urgent: 'bg-rose-50 text-rose-700'
};
