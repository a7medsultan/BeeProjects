import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createProjectFormSchema } from '#lib/schemas/projects.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireProjectManageable } from '#lib/server/permissions.ts';
import {
	getOwnerCandidates,
	getProjectSummary,
	ProjectInputError,
	reassignProjectOwner,
	updateProject
} from '#lib/server/services/projects.ts';
import { localizeServerMessage, translate } from '#lib/i18n/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = getDb();
	const access = requireProjectManageable(db, event.params.id, user);
	const project = getProjectSummary(db, event.params.id, user);

	if (!project) {
		error(404, 'Project not found');
	}

	const ownerCandidates = access.isAdmin ? getOwnerCandidates(db) : [];

	if (access.isAdmin && !ownerCandidates.some((owner) => owner.id === project.ownerId)) {
		ownerCandidates.unshift({ id: project.ownerId, name: `${project.ownerName} (inactive)` });
	}

	return {
		project,
		permissions: access,
		ownerCandidates,
		form: await superValidate(
			{
				name: project.name,
				description: project.description,
				startDate: project.startDate ?? '',
				dueDate: project.dueDate ?? '',
				priority: project.priority,
				status: project.status === 'Archived' ? 'Planning' : project.status,
				ownerId: project.ownerId
			},
			zod4(createProjectFormSchema(event.locals.locale))
		)
	};
};

export const actions: Actions = {
	update: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const access = requireProjectManageable(db, event.params.id, user);
		const project = getProjectSummary(db, event.params.id, user);

		if (!project) {
			error(404, 'Project not found');
		}

		const form = await superValidate(event, zod4(createProjectFormSchema(event.locals.locale)));

		if (!form.valid) {
			return fail(400, { form });
		}

		const ownerId = form.data.ownerId || '';
		const changingOwner = access.isAdmin && ownerId !== '' && ownerId !== project.ownerId;

		if (changingOwner) {
			const validOwner = getOwnerCandidates(db).some((owner) => owner.id === ownerId);

			if (!validOwner) {
				setError(form, 'ownerId', translate(event.locals.locale, 'errors.ownerActive'));
				return fail(400, { form });
			}
		}

		try {
			updateProject(
				db,
				project.id,
				{
					...form.data,
					ownerId: undefined
				},
				user
			);

			if (changingOwner) {
				reassignProjectOwner(db, project.id, ownerId, user);
			}
		} catch (error) {
			if (error instanceof ProjectInputError) {
				setError(form, 'ownerId', localizeServerMessage(event.locals.locale, error.message));
				return fail(400, { form });
			}

			throw error;
		}

		return message(form, {
			type: 'success',
			text: translate(event.locals.locale, 'server.projectUpdated')
		});
	}
};
