import { error, fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createTaskCreateSchema } from '#lib/schemas/tasks.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireProjectManageable } from '#lib/server/permissions.ts';
import { listProjectMembers } from '#lib/server/services/projects.ts';
import {
	createTask,
	getTopLevelTaskForCreate,
	TaskInputError
} from '#lib/server/services/tasks.ts';
import { localizeServerMessage } from '#lib/i18n/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = getDb();
	requireProjectManageable(db, event.params.id, user);

	const parentId = event.url.searchParams.get('parent') ?? '';
	let parent: { id: string; title: string } | null = null;

	if (parentId) {
		parent = getTopLevelTaskForCreate(db, event.params.id, parentId);

		if (!parent) {
			error(404, 'Parent task not found in this project');
		}
	}

	const form = await superValidate(zod4(createTaskCreateSchema(event.locals.locale)), {
		defaults: {
			title: '',
			description: '',
			priority: 'Medium',
			status: 'To Do',
			startDate: '',
			dueDate: '',
			assigneeIds: [],
			parentTaskId: parent?.id ?? ''
		}
	});

	return {
		form,
		parent,
		members: listProjectMembers(db, event.params.id).filter((member) => member.isActive)
	};
};

export const actions: Actions = {
	create: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		requireProjectManageable(db, event.params.id, user);

		const form = await superValidate(event, zod4(createTaskCreateSchema(event.locals.locale)));

		if (!form.valid) {
			return fail(400, { form });
		}

		let taskId: string;

		try {
			taskId = createTask(
				db,
				event.params.id,
				{
					...form.data,
					parentTaskId: form.data.parentTaskId || undefined
				},
				user
			);
		} catch (error) {
			if (error instanceof TaskInputError) {
				if (error.field === 'parentTaskId') {
					setError(form, 'parentTaskId', localizeServerMessage(event.locals.locale, error.message));
					return fail(400, { form });
				}

				return message(
					form,
					{ type: 'error', text: localizeServerMessage(event.locals.locale, error.message) },
					{ status: 400 }
				);
			}

			throw error;
		}

		redirect(303, `/tasks/${taskId}`);
	}
};
