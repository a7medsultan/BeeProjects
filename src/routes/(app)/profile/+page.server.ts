import { fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { changePasswordSchema, profileSchema } from '#lib/schemas/auth.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { isValidTimezone, getSupportedTimezones } from '#lib/server/dates.ts';
import { verifyPassword } from '#lib/server/auth/password.ts';
import {
	clearSessionCookie,
	getSessionToken,
	revokeAllUserSessions,
	revokeSession
} from '#lib/server/auth/session.ts';
import {
	changeOwnPassword,
	getUserByEmail,
	getUserById,
	updateUser
} from '#lib/server/services/users.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const actor = requireUser(event, { allowPendingPassword: true });
	const db = getDb();
	const user = getUserById(db, actor.id);

	if (!user) {
		clearSessionCookie(event.cookies);
		redirect(303, '/login');
	}

	return {
		profileForm: await superValidate(
			{ name: user.name, timezone: user.timezone },
			zod4(profileSchema)
		),
		passwordForm: await superValidate(zod4(changePasswordSchema)),
		timezones: getSupportedTimezones(),
		forcePasswordChange: user.mustChangePassword
	};
};

export const actions: Actions = {
	updateProfile: async (event) => {
		const actor = requireUser(event, { allowPendingPassword: true });
		const form = await superValidate(event, zod4(profileSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		if (!isValidTimezone(form.data.timezone)) {
			setError(form, 'timezone', 'Select a valid timezone.');
			return fail(400, { form });
		}

		const db = getDb();
		const current = getUserById(db, actor.id);

		if (!current) {
			redirect(303, '/login');
		}

		updateUser(db, current.id, {
			name: form.data.name,
			email: current.email,
			role: current.role,
			timezone: form.data.timezone
		});

		event.locals.user = {
			...actor,
			name: form.data.name.trim(),
			timezone: form.data.timezone
		};

		return message(form, { type: 'success', text: 'Profile updated.' });
	},

	changePassword: async (event) => {
		const actor = requireUser(event, { allowPendingPassword: true });
		const form = await superValidate(event, zod4(changePasswordSchema));

		if (!form.valid) {
			scrubPasswordForm(form);
			return fail(400, { form });
		}

		const currentPassword = form.data._currentPassword;
		const newPassword = form.data._newPassword;

		const db = getDb();
		const user = getUserByEmail(db, actor.email);

		if (!user) {
			redirect(303, '/login');
		}

		const validCurrent = await verifyPassword(user.passwordHash, currentPassword);

		if (!validCurrent) {
			setError(form, '_currentPassword', 'Current password is incorrect.');
			scrubPasswordForm(form);
			return fail(400, { form });
		}

		await changeOwnPassword(db, user.id, newPassword);

		const token = getSessionToken(event.cookies);
		revokeAllUserSessions(db, user.id, token);

		event.locals.user = { ...actor, mustChangePassword: false };

		scrubPasswordForm(form);

		return message(form, {
			type: 'success',
			text: 'Password changed. Other sessions have been signed out.'
		});
	},

	logout: async (event) => {
		const token = getSessionToken(event.cookies);

		if (token) {
			revokeSession(getDb(), token);
		}

		clearSessionCookie(event.cookies);
		event.locals.user = null;
		event.locals.session = null;

		redirect(303, '/login?loggedOut=1');
	}
};

function scrubPasswordForm(form: {
	data: {
		_currentPassword: string;
		_newPassword: string;
		_confirmPassword: string;
	};
}): void {
	form.data._currentPassword = '';
	form.data._newPassword = '';
	form.data._confirmPassword = '';
}
