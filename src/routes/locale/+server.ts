import { redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { safeRedirect } from '#lib/server/auth/redirect.ts';
import { setUserLocale } from '#lib/server/services/users.ts';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from '#lib/i18n/locales.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, locals, url }) => {
	const form = await request.formData();
	const locale = form.get('locale');

	if (!isLocale(locale)) {
		redirect(303, safeRedirect(form.get('redirectTo')?.toString()));
	}

	cookies.set(LOCALE_COOKIE, locale, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: LOCALE_COOKIE_MAX_AGE,
		secure: url.protocol === 'https:'
	});

	if (locals.user) {
		setUserLocale(getDb(), locals.user.id, locale);
	}

	redirect(303, safeRedirect(form.get('redirectTo')?.toString()));
};
