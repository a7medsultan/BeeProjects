import { z } from 'zod';
import { translate } from '#lib/i18n/index.ts';
import type { Locale } from '#lib/i18n/locales.ts';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants.ts';

export function createTaskFormSchema(locale: Locale = 'en') {
	return createTaskFields(locale).refine(
		(data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate,
		{
			message: translate(locale, 'validation.dueAfterStart'),
			path: ['dueDate']
		}
	);
}

export function createTaskCreateSchema(locale: Locale = 'en') {
	return createTaskFields(locale)
		.extend({
			parentTaskId: z.string().max(64).optional().default('')
		})
		.refine((data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate, {
			message: translate(locale, 'validation.dueAfterStart'),
			path: ['dueDate']
		});
}

function createTaskFields(locale: Locale) {
	const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

	const optionalDate = z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.dateFormat'))
		.or(z.literal(''))
		.optional()
		.default('');

	return z.object({
		title: z
			.string()
			.trim()
			.min(2, t('validation.taskTitleMin'))
			.max(200, t('validation.taskTitleMax')),
		description: z.string().trim().max(10000, t('validation.taskDescriptionMax')).default(''),
		priority: z.enum(TASK_PRIORITIES),
		status: z.enum(TASK_STATUSES),
		startDate: optionalDate,
		dueDate: optionalDate,
		assigneeIds: z.array(z.string().max(64)).default([])
	});
}

export const taskListQuerySchema = z.object({
	q: z.string().trim().max(100).optional().default(''),
	status: z
		.enum(['all', ...TASK_STATUSES])
		.optional()
		.default('all'),
	priority: z
		.enum(['all', ...TASK_PRIORITIES])
		.optional()
		.default('all'),
	assignee: z.string().trim().max(64).optional().default('all'),
	due: z.enum(['all', 'overdue', 'today', 'week']).optional().default('all'),
	sort: z.enum(['due_date', 'priority', 'created_at']).optional().default('created_at'),
	dir: z.enum(['asc', 'desc']).optional().default('desc'),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(5).max(100).default(20)
});

export type TaskFormInput = z.infer<ReturnType<typeof createTaskFormSchema>>;
export type TaskCreateInput = z.infer<ReturnType<typeof createTaskCreateSchema>>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
