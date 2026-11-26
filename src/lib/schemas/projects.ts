import { z } from 'zod';
import { translate } from '#lib/i18n/index.ts';
import type { Locale } from '#lib/i18n/locales.ts';
import { PROJECT_OPEN_STATUSES, PROJECT_PRIORITIES, PROJECT_STATUSES } from '../constants.ts';

export function createProjectFormSchema(locale: Locale = 'en') {
	const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

	const optionalDate = z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.dateFormat'))
		.or(z.literal(''))
		.optional()
		.default('');

	return z
		.object({
			name: z
				.string()
				.trim()
				.min(2, t('validation.projectNameMin'))
				.max(120, t('validation.projectNameMax')),
			description: z.string().trim().max(5000, t('validation.descriptionMax')).default(''),
			startDate: optionalDate,
			dueDate: optionalDate,
			priority: z.enum(PROJECT_PRIORITIES),
			status: z.enum(PROJECT_OPEN_STATUSES),
			ownerId: z.string().max(64).optional().default('')
		})
		.refine((data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate, {
			message: t('validation.dueAfterStart'),
			path: ['dueDate']
		});
}

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

export type ProjectFormInput = z.infer<ReturnType<typeof createProjectFormSchema>>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
