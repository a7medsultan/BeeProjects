import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { SESSION_TTL_DAYS } from '$app/env/private';
import { loginSchema } from '#lib/schemas/auth.ts';
import { getDb } from '#lib/server/db/index.ts';
import { verifyPassword } from '#lib/server/auth/password.ts';
import { createSession, setSessionCookie } from '#lib/server/auth/session.ts';
import { safeRedirect } from '#lib/server/auth/redirect.ts';
import {
	checkRateLimits,
	rateLimitKeys,
	recordFailures,
	resetRateLimits
} from '#lib/server/auth/rate-limit.ts';
import { getUserByEmail, toPublicUser, touchLastLogin } from '#lib/server/services/users.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		if (locals.user.mustChangePassword) redirect(303, '/profile?force=1');
		redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	}

	const form = await superValidate(zod4(loginSchema));
	form.data.redirectTo = url.searchParams.get('redirectTo') ?? '';

	return {
		form,
		loggedOut: url.searchParams.get('loggedOut') === '1'
	};
};

export const actions: Actions = {
	login: async (event) => {
		const form = await superValidate(event, zod4(loginSchema));

		if (!form.valid) {
			scrubPassword(form);
			return fail(400, { form });
		}

		const email = form.data.email.trim().toLowerCase();
		const password = form.data._password;
		let ip = 'unknown';

		try {
			ip = event.getClientAddress();
		} catch {
			// Some runtimes cannot provide a client address; rate limiting still
			// uses the email key.
		}

		const keys = rateLimitKeys(ip, email);
		const limit = checkRateLimits(keys);

		if (limit.limited) {
			const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
			scrubPassword(form);
			return message(
				form,
				{
					type: 'error',
					text: `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
				},
				{ status: 429 }
			);
		}

		const db = getDb();
		const user = getUserByEmail(db, email);
		const validPassword = user ? await verifyPassword(user.passwordHash, password) : false;

		if (!user || !validPassword || !user.isActive) {
			recordFailures(keys);
			scrubPassword(form);
			return message(form, { type: 'error', text: 'Invalid email or password.' }, { status: 400 });
		}

		resetRateLimits(keys);

		const { token, expiresAt } = createSession(db, user.id, SESSION_TTL_DAYS, {
			ip,
			userAgent: event.request.headers.get('user-agent') ?? undefined
		});

		setSessionCookie(event.cookies, token, expiresAt, SESSION_TTL_DAYS);
		touchLastLogin(db, user.id);

		event.locals.user = toPublicUser(user);
		event.locals.session = { expiresAt };

		if (user.mustChangePassword) {
			redirect(303, '/profile?force=1');
		}

		redirect(303, safeRedirect(form.data.redirectTo));
	}
};

function scrubPassword(form: { data: { _password: string } }): void {
	form.data._password = '';
}
