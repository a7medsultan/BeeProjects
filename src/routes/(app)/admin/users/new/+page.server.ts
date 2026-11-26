import { fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createUserSchema } from '#lib/schemas/users.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireAdmin } from '#lib/server/auth/guards.ts';
import { getSupportedTimezones, isValidTimezone } from '#lib/server/dates.ts';
import { createUser, UserEmailConflictError } from '#lib/server/services/users.ts';
import { localizeServerMessage, translate } from '#lib/i18n/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);

	const form = await superValidate(zod4(createUserSchema(event.locals.locale)), {
		defaults: { name: '', email: '', role: 'member', timezone: 'UTC' }
	});

	return {
		form,
		timezones: getSupportedTimezones()
	};
};

export const actions: Actions = {
	create: async (event) => {
		requireAdmin(event);

		const form = await superValidate(event, zod4(createUserSchema(event.locals.locale)));

		if (!form.valid) {
			return fail(400, { form });
		}

		if (!isValidTimezone(form.data.timezone)) {
			setError(form, 'timezone', translate(event.locals.locale, 'validation.timezoneInvalid'));
			return fail(400, { form });
		}

		try {
			const created = await createUser(getDb(), form.data);

			return message(form, {
				type: 'success',
				text: translate(event.locals.locale, 'server.userCreated', { email: created.email }),
				tempPassword: created.tempPassword
			});
		} catch (error) {
			if (error instanceof UserEmailConflictError) {
				setError(form, 'email', localizeServerMessage(event.locals.locale, error.message));
				return fail(400, { form });
			}

			throw error;
		}
	}
};
