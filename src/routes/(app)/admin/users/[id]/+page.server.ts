import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { updateUserSchema } from '#lib/schemas/users.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireAdmin } from '#lib/server/auth/guards.ts';
import { revokeAllUserSessions } from '#lib/server/auth/session.ts';
import { getSupportedTimezones, isValidTimezone } from '#lib/server/dates.ts';
import {
	countActiveAdmins,
	getUserById,
	resetUserPassword,
	setUserActive,
	updateUser,
	UserEmailConflictError
} from '#lib/server/services/users.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	const db = getDb();
	const user = getUserById(db, event.params.id);

	if (!user) {
		error(404, 'User not found');
	}

	return {
		managedUser: user,
		form: await superValidate(
			{ name: user.name, email: user.email, role: user.role, timezone: user.timezone },
			zod4(updateUserSchema)
		),
		timezones: getSupportedTimezones(),
		activeAdminCount: countActiveAdmins(db)
	};
};

export const actions: Actions = {
	update: async (event) => {
		const actor = requireAdmin(event);
		const form = await superValidate(event, zod4(updateUserSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		if (!isValidTimezone(form.data.timezone)) {
			setError(form, 'timezone', 'Select a valid timezone.');
			return fail(400, { form });
		}

		const db = getDb();
		const target = getUserById(db, event.params.id);

		if (!target) {
			error(404, 'User not found');
		}

		const isSelf = target.id === actor.id;

		if (isSelf && form.data.role !== 'admin') {
			setError(form, 'role', 'You cannot change your own role.');
			return fail(400, { form });
		}

		if (
			target.role === 'admin' &&
			form.data.role !== 'admin' &&
			target.isActive &&
			countActiveAdmins(db) <= 1
		) {
			setError(form, 'role', 'The last active admin cannot be demoted.');
			return fail(400, { form });
		}

		if (form.data.role === 'member' && target.ownedProjects > 0) {
			setError(form, 'role', 'Transfer ownership of this user’s projects first.');
			return fail(400, { form });
		}

		try {
			updateUser(db, target.id, {
				name: form.data.name,
				email: form.data.email,
				role: form.data.role,
				timezone: form.data.timezone
			});
		} catch (error) {
			if (error instanceof UserEmailConflictError) {
				setError(form, 'email', error.message);
				return fail(400, { form });
			}

			throw error;
		}

		if (isSelf) {
			event.locals.user = {
				...actor,
				name: form.data.name.trim(),
				email: form.data.email.trim().toLowerCase(),
				timezone: form.data.timezone
			};
		}

		return message(form, { type: 'success', text: 'User updated.' });
	},

	deactivate: async (event) => {
		const actor = requireAdmin(event);
		const db = getDb();
		const target = getUserById(db, event.params.id);

		if (!target) {
			error(404, 'User not found');
		}

		if (target.id === actor.id) {
			return fail(400, { error: 'You cannot deactivate your own account.' });
		}

		if (target.isActive && target.role === 'admin' && countActiveAdmins(db) <= 1) {
			return fail(400, { error: 'The last active admin cannot be deactivated.' });
		}

		if (target.isActive && target.ownedProjects > 0) {
			return fail(400, {
				error: 'Transfer ownership of this user’s projects before deactivating the account.'
			});
		}

		setUserActive(db, target.id, false);
		revokeAllUserSessions(db, target.id);

		return { notice: `${target.name} has been deactivated and signed out.` };
	},

	reactivate: async (event) => {
		requireAdmin(event);
		const db = getDb();
		const target = getUserById(db, event.params.id);

		if (!target) {
			error(404, 'User not found');
		}

		setUserActive(db, target.id, true);

		return { notice: `${target.name} has been reactivated.` };
	},

	resetPassword: async (event) => {
		const actor = requireAdmin(event);
		const db = getDb();
		const target = getUserById(db, event.params.id);

		if (!target) {
			error(404, 'User not found');
		}

		if (target.id === actor.id) {
			return fail(400, {
				error: 'Use the profile page to change your own password.'
			});
		}

		const tempPassword = await resetUserPassword(db, target.id);
		revokeAllUserSessions(db, target.id);

		return {
			resetPassword: tempPassword,
			resetEmail: target.email
		};
	}
};
