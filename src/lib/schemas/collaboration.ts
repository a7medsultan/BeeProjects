import { z } from 'zod';
import { translate } from '#lib/i18n/index.ts';
import type { Locale } from '#lib/i18n/locales.ts';

export function createCommentSchema(locale: Locale = 'en') {
	const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

	return z.object({
		body: z
			.string()
			.trim()
			.min(1, t('validation.commentEmpty'))
			.max(5000, t('validation.commentMax'))
	});
}

export type CommentInput = z.infer<ReturnType<typeof createCommentSchema>>;
