import { z } from 'zod';
import { translate } from '#lib/i18n/index.ts';
import { LOCALES, type Locale } from '#lib/i18n/locales.ts';

export function createLoginSchema(locale: Locale = 'en') {
	const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

	return z.object({
		email: z.email(t('validation.emailInvalid')).max(254, t('validation.emailTooLong')),
		_password: z
			.string()
			.min(1, t('validation.passwordRequired'))
			.max(128, t('validation.passwordTooLong')),
		redirectTo: z.string().max(2048).optional().default('')
	});
}

export function createProfileSchema(locale: Locale = 'en') {
	const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

	return z.object({
		name: z.string().trim().min(2, t('validation.nameMin')).max(100, t('validation.nameMax')),
		timezone: z.string().trim().min(1, t('validation.timezoneRequired')).max(64),
		locale: z.enum(LOCALES, { message: t('validation.localeInvalid') })
	});
}

export function createChangePasswordSchema(locale: Locale = 'en') {
	const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

	return z
		.object({
			_currentPassword: z
				.string()
				.min(1, t('validation.currentPasswordRequired'))
				.max(128, t('validation.passwordTooLong')),
			_newPassword: z
				.string()
				.min(10, t('validation.newPasswordMin'))
				.max(128, t('validation.newPasswordMax')),
			_confirmPassword: z.string().min(1, t('validation.confirmRequired')).max(128)
		})
		.refine((data) => data._newPassword === data._confirmPassword, {
			message: t('validation.passwordsMismatch'),
			path: ['_confirmPassword']
		})
		.refine((data) => data._newPassword !== data._currentPassword, {
			message: t('validation.passwordSame'),
			path: ['_newPassword']
		});
}

export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type ProfileInput = z.infer<ReturnType<typeof createProfileSchema>>;
export type ChangePasswordInput = z.infer<ReturnType<typeof createChangePasswordSchema>>;
