import { error, fail, redirect } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { projectFormSchema } from '#lib/schemas/projects.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import {
	createProject,
	getOwnerCandidates,
	ProjectInputError
} from '#lib/server/services/projects.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	if (user.role === 'member') {
		error(403, 'Only admins and project managers can create projects');
	}

	const db = getDb();
	const form = await superValidate(zod4(projectFormSchema), {
		defaults: {
			name: '',
			description: '',
			startDate: '',
			dueDate: '',
			priority: 'Medium',
			status: 'Planning',
			ownerId: user.id
		}
	});

	return {
		form,
		isAdmin: user.role === 'admin',
		ownerCandidates: user.role === 'admin' ? getOwnerCandidates(db) : []
	};
};

export const actions: Actions = {
	create: async (event) => {
		const user = requireUser(event);

		if (user.role === 'member') {
			error(403, 'Only admins and project managers can create projects');
		}

		const form = await superValidate(event, zod4(projectFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		let projectId: string;

		try {
			projectId = createProject(
				getDb(),
				{
					...form.data,
					ownerId: form.data.ownerId || undefined
				},
				user
			);
		} catch (error) {
			if (error instanceof ProjectInputError) {
				setError(form, 'ownerId', error.message);
				return fail(400, { form });
			}

			throw error;
		}

		redirect(303, `/projects/${projectId}`);
	}
};
