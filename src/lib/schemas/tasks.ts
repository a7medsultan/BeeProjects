import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants.ts';

const optionalDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
	.or(z.literal(''))
	.optional()
	.default('');

const dateOrder = {
	message: 'Due date must be on or after the start date',
	path: ['dueDate']
};

const taskFields = z.object({
	title: z.string().trim().min(2, 'Task title must be at least 2 characters').max(200),
	description: z.string().trim().max(10000, 'Description is too long').default(''),
	priority: z.enum(TASK_PRIORITIES),
	status: z.enum(TASK_STATUSES),
	startDate: optionalDate,
	dueDate: optionalDate,
	assigneeIds: z.array(z.string().max(64)).default([])
});

export const taskFormSchema = taskFields.refine(
	(data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate,
	dateOrder
);

export const taskCreateSchema = taskFields
	.extend({
		parentTaskId: z.string().max(64).optional().default('')
	})
	.refine((data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate, dateOrder);

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

export type TaskFormInput = z.infer<typeof taskFormSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
