import { z } from 'zod';
import { PROJECT_OPEN_STATUSES, PROJECT_PRIORITIES, PROJECT_STATUSES } from '../constants.ts';

const optionalDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
	.or(z.literal(''))
	.optional()
	.default('');

export const projectFormSchema = z
	.object({
		name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(120),
		description: z.string().trim().max(5000, 'Description is too long').default(''),
		startDate: optionalDate,
		dueDate: optionalDate,
		priority: z.enum(PROJECT_PRIORITIES),
		status: z.enum(PROJECT_OPEN_STATUSES),
		ownerId: z.string().max(64).optional().default('')
	})
	.refine((data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate, {
		message: 'Due date must be on or after the start date',
		path: ['dueDate']
	});

export const projectListQuerySchema = z.object({
	q: z.string().trim().max(100).optional().default(''),
	status: z
		.enum(['open', 'all', ...PROJECT_STATUSES])
		.optional()
		.default('open'),
	owner: z.string().trim().max(64).optional().default('all'),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(4).max(48).default(12)
});

export type ProjectFormInput = z.infer<typeof projectFormSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
