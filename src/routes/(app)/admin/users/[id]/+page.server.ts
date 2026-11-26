import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createUpdateUserSchema } from '#lib/schemas/users.ts';
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
import { localizeServerMessage, translate } from '#lib/i18n/index.ts';
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
			zod4(createUpdateUserSchema(event.locals.locale))
		),
		timezones: getSupportedTimezones(),
		activeAdminCount: countActiveAdmins(db)
	};
};

export const actions: Actions = {
	update: async (event) => {
		const actor = requireAdmin(event);
		const form = await superValidate(event, zod4(createUpdateUserSchema(event.locals.locale)));

		if (!form.valid) {
			return fail(400, { form });
		}

		if (!isValidTimezone(form.data.timezone)) {
			setError(form, 'timezone', translate(event.locals.locale, 'validation.timezoneInvalid'));
			return fail(400, { form });
		}

		const db = getDb();
		const target = getUserById(db, event.params.id);

		if (!target) {
			error(404, 'User not found');
		}

		const isSelf = target.id === actor.id;

		if (isSelf && form.data.role !== 'admin') {
			setError(form, 'role', translate(event.locals.locale, 'errors.cannotChangeOwnRole'));
			return fail(400, { form });
		}

		if (
			target.role === 'admin' &&
			form.data.role !== 'admin' &&
			target.isActive &&
			countActiveAdmins(db) <= 1
		) {
			setError(form, 'role', translate(event.locals.locale, 'errors.lastAdminDemote'));
			return fail(400, { form });
		}

		if (form.data.role === 'member' && target.ownedProjects > 0) {
			setError(form, 'role', translate(event.locals.locale, 'errors.transferOwnership'));
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
				setError(form, 'email', localizeServerMessage(event.locals.locale, error.message));
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

		return message(form, {
			type: 'success',
			text: translate(event.locals.locale, 'server.userUpdated')
		});
	},

	deactivate: async (event) => {
		const actor = requireAdmin(event);
		const db = getDb();
		const target = getUserById(db, event.params.id);

		if (!target) {
			error(404, 'User not found');
		}

		if (target.id === actor.id) {
			return fail(400, { error: translate(event.locals.locale, 'errors.cannotDeactivateSelf') });
		}

		if (target.isActive && target.role === 'admin' && countActiveAdmins(db) <= 1) {
			return fail(400, { error: translate(event.locals.locale, 'errors.lastAdminDeactivate') });
		}

		if (target.isActive && target.ownedProjects > 0) {
			return fail(400, {
				error: translate(event.locals.locale, 'server.transferBeforeDeactivate')
			});
		}

		setUserActive(db, target.id, false);
		revokeAllUserSessions(db, target.id);

		return {
			notice: translate(event.locals.locale, 'server.userDeactivatedName', {
				name: target.name
			})
		};
	},

	reactivate: async (event) => {
		requireAdmin(event);
		const db = getDb();
		const target = getUserById(db, event.params.id);

		if (!target) {
			error(404, 'User not found');
		}

		setUserActive(db, target.id, true);

		return {
			notice: translate(event.locals.locale, 'server.userReactivatedName', {
				name: target.name
			})
		};
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
				error: translate(event.locals.locale, 'server.resetOwnPassword')
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
