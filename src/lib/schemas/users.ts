import { z } from 'zod';
import { translate } from '#lib/i18n/index.ts';
import type { Locale } from '#lib/i18n/locales.ts';

const roleSchema = z.enum(['admin', 'project_manager', 'member']);

export function createUserSchema(locale: Locale = 'en') {
	const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

	return z.object({
		name: z.string().trim().min(2, t('validation.nameMin')).max(100, t('validation.nameMax')),
		email: z.email(t('validation.emailInvalid')).max(254, t('validation.emailTooLong')),
		role: roleSchema,
		timezone: z.string().trim().min(1, t('validation.timezoneRequired')).max(64)
	});
}

export function createUpdateUserSchema(locale: Locale = 'en') {
	return createUserSchema(locale);
}

export const userListQuerySchema = z.object({
	q: z.string().trim().max(100).optional().default(''),
	role: z.enum(['all', 'admin', 'project_manager', 'member']).optional().default('all'),
	status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(5).max(100).default(20)
});

export type CreateUserInput = z.infer<ReturnType<typeof createUserSchema>>;
export type UpdateUserInput = z.infer<ReturnType<typeof createUpdateUserSchema>>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
